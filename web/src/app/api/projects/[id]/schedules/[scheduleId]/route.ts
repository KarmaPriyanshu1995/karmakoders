import { NextResponse } from "next/server";
import { getSql } from "@/lib/db";

export const dynamic = "force-dynamic";

type Params = { params: { id: string; scheduleId: string } };

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function noStore(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0" },
  });
}

function nextRunAt(cadence: string): Date {
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  if (cadence === "weekly") return new Date(now + 7 * day);
  if (cadence === "monthly") return new Date(now + 30 * day);
  return new Date(now + day);
}

export async function PATCH(request: Request, { params }: Params) {
  const { id: projectId, scheduleId } = params;
  if (!UUID_RE.test(projectId) || !UUID_RE.test(scheduleId)) {
    return noStore({ error: "Invalid id." }, 400);
  }
  let body: { enabled?: boolean; cadence?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return noStore({ error: "Expected JSON body." }, 400);
  }

  const sql = getSql();
  try {
    const existing = await sql`
      SELECT id, cadence FROM scan_schedules
      WHERE id = ${scheduleId} AND project_id = ${projectId}
      LIMIT 1
    `;
    if (!existing[0]) {
      return noStore({ error: "Schedule not found." }, 404);
    }

    const cadence = ["daily", "weekly", "monthly"].includes(String(body.cadence))
      ? String(body.cadence)
      : String(existing[0].cadence);
    const enabled = body.enabled;
    const next = nextRunAt(cadence);

    const updated = await sql`
      UPDATE scan_schedules
      SET
        cadence = ${cadence},
        enabled = COALESCE(${enabled ?? null}::boolean, enabled),
        next_run_at = CASE
          WHEN ${enabled === false} THEN next_run_at
          WHEN ${body.cadence != null} THEN ${next.toISOString()}::timestamptz
          ELSE next_run_at
        END,
        updated_at = now()
      WHERE id = ${scheduleId} AND project_id = ${projectId}
      RETURNING id, enabled, cadence, next_run_at
    `;
    return noStore({
      id: updated[0].id,
      enabled: updated[0].enabled,
      cadence: updated[0].cadence,
      nextRunAt: updated[0].next_run_at,
    });
  } catch (error) {
    console.error("patch schedule failed", error);
    return noStore({ error: "Could not update schedule." }, 500);
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id: projectId, scheduleId } = params;
  if (!UUID_RE.test(projectId) || !UUID_RE.test(scheduleId)) {
    return noStore({ error: "Invalid id." }, 400);
  }
  const sql = getSql();
  try {
    const deleted = await sql`
      DELETE FROM scan_schedules
      WHERE id = ${scheduleId} AND project_id = ${projectId}
      RETURNING id
    `;
    if (!deleted[0]) {
      return noStore({ error: "Schedule not found." }, 404);
    }
    return noStore({ deleted: true, id: scheduleId });
  } catch (error) {
    console.error("delete schedule failed", error);
    return noStore({ error: "Could not delete schedule." }, 500);
  }
}
