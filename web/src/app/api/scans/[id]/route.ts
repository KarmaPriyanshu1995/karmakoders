import { NextResponse } from "next/server";
import { getSql } from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

type Params = { params: { id: string } };

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function noStore(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
    },
  });
}

export async function GET(_request: Request, { params }: Params) {
  const id = params.id;
  if (!UUID_RE.test(id)) {
    return noStore({ error: "Invalid scan id." }, 400);
  }

  try {
    const sql = getSql();
    const scans = await sql`
      SELECT
        s.id,
        s.project_id,
        s.type,
        s.status,
        s.grade,
        s.started_at,
        s.finished_at,
        p.primary_url,
        p.name AS project_name
      FROM scans s
      JOIN projects p ON p.id = s.project_id
      WHERE s.id = ${id}
      LIMIT 1
    `;
    const scan = scans[0];
    if (!scan) {
      return noStore({ error: "Scan not found." }, 404);
    }

    const events = await sql`
      SELECT id, message, created_at
      FROM scan_events
      WHERE scan_id = ${id}
      ORDER BY created_at ASC, id ASC
    `;

    return noStore({
      id: scan.id,
      projectId: scan.project_id,
      type: scan.type,
      status: scan.status,
      grade: scan.grade,
      startedAt: scan.started_at,
      finishedAt: scan.finished_at,
      primaryUrl: scan.primary_url,
      projectName: scan.project_name,
      events: events.map((event) => ({
        id: event.id,
        message: event.message,
        createdAt: event.created_at,
      })),
    });
  } catch (error) {
    console.error("get scan failed", error);
    return noStore({ error: "Could not load the scan." }, 500);
  }
}
