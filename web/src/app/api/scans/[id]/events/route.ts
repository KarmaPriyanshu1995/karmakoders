import { getSql } from "@/lib/db";
import { deriveProgress } from "@/lib/scan-progress";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Params = { params: { id: string } };

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function sseLine(event: string, data: unknown, id?: string): string {
  const payload = JSON.stringify(data);
  const lines = [`event: ${event}`, `data: ${payload}`];
  if (id) lines.unshift(`id: ${id}`);
  return `${lines.join("\n")}\n\n`;
}

/**
 * Server-Sent Events for live scan progress.
 *
 * Contract:
 * - event: scan.snapshot — initial/current state
 * - event: scan.progress — new scan_events row
 * - event: scan.terminal — status is done|failed
 *
 * Cursor: Last-Event-ID or ?after=<event uuid>
 * Disconnect does NOT cancel the worker scan.
 *
 * Access model: same as GET /api/scans/[id] (scan id knowledge). Full auth is later.
 */
export async function GET(request: Request, { params }: Params) {
  const id = params.id;
  if (!UUID_RE.test(id)) {
    return new Response(JSON.stringify({ error: "Invalid scan id." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const url = new URL(request.url);
  const afterParam = url.searchParams.get("after");
  const lastEventHeader = request.headers.get("Last-Event-ID");
  let afterId =
    (afterParam && UUID_RE.test(afterParam) && afterParam) ||
    (lastEventHeader && UUID_RE.test(lastEventHeader) && lastEventHeader) ||
    null;

  const encoder = new TextEncoder();
  const sql = getSql();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (chunk: string) => {
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          /* closed */
        }
      };

      let closed = false;
      const close = () => {
        if (closed) return;
        closed = true;
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      };

      request.signal.addEventListener("abort", () => {
        closed = true;
        close();
      });

      const pollOnce = async (): Promise<"continue" | "terminal" | "missing"> => {
        const scans = await sql`
          SELECT id, status, grade, grade_algorithm_version
          FROM scans WHERE id = ${id} LIMIT 1
        `;
        const scan = scans[0];
        if (!scan) return "missing";

        const events = afterId
          ? await sql`
              SELECT id, message, created_at
              FROM scan_events
              WHERE scan_id = ${id}
                AND created_at >= (
                  SELECT created_at FROM scan_events WHERE id = ${afterId} LIMIT 1
                )
                AND id <> ${afterId}
              ORDER BY created_at ASC, id ASC
              LIMIT 50
            `
          : await sql`
              SELECT id, message, created_at
              FROM scan_events
              WHERE scan_id = ${id}
              ORDER BY created_at ASC, id ASC
              LIMIT 50
            `;

        // If afterId invalid / not found, fall back to all (handled by empty created_at subquery → no rows).
        // Safer: if afterId set but zero events and scan still running, try events after by id order only when we have after.
        let batch = events;
        if (afterId && batch.length === 0) {
          batch = await sql`
            SELECT id, message, created_at
            FROM scan_events
            WHERE scan_id = ${id} AND id > ${afterId}
            ORDER BY created_at ASC, id ASC
            LIMIT 50
          `;
        }

        if (!afterId) {
          const allMessages = (
            await sql`
              SELECT message FROM scan_events
              WHERE scan_id = ${id}
              ORDER BY created_at ASC, id ASC
            `
          ).map((e) => String(e.message));
          const progress = deriveProgress(scan.status, allMessages);
          send(
            sseLine("scan.snapshot", {
              type: "scan.snapshot",
              scanId: id,
              status: scan.status,
              grade: scan.status === "done" ? scan.grade : null,
              gradeAlgorithmVersion: scan.grade_algorithm_version,
              stage: progress.stage,
              progress: progress.progress,
              message: progress.label,
              timestamp: new Date().toISOString(),
            })
          );
        }

        for (const event of batch) {
          afterId = String(event.id);
          const allMessages = (
            await sql`
              SELECT message FROM scan_events
              WHERE scan_id = ${id}
              ORDER BY created_at ASC, id ASC
            `
          ).map((e) => String(e.message));
          const progress = deriveProgress(scan.status, allMessages);
          send(
            sseLine(
              "scan.progress",
              {
                type: "scan.progress",
                scanId: id,
                eventId: event.id,
                stage: progress.stage,
                message: event.message,
                progress: progress.progress,
                status: scan.status,
                timestamp: event.created_at,
              },
              String(event.id)
            )
          );
        }

        if (scan.status === "done" || scan.status === "failed") {
          send(
            sseLine("scan.terminal", {
              type: "scan.terminal",
              scanId: id,
              status: scan.status,
              grade: scan.status === "done" ? scan.grade : null,
              timestamp: new Date().toISOString(),
            })
          );
          return "terminal";
        }
        return "continue";
      };

      try {
        // Initial + bounded poll loop (max ~5 minutes of SSE for a live client).
        for (let i = 0; i < 150 && !closed; i++) {
          const result = await pollOnce();
          if (result === "missing") {
            send(sseLine("scan.error", { type: "scan.error", message: "Scan not found." }));
            break;
          }
          if (result === "terminal") break;
          await new Promise((r) => setTimeout(r, 2000));
        }
      } catch (error) {
        console.error("sse scan events failed", error);
        send(sseLine("scan.error", { type: "scan.error", message: "Stream error." }));
      } finally {
        close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
