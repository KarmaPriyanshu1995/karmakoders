import { NextResponse } from "next/server";
import { getSql } from "@/lib/scanner/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

type Params = { params: Promise<{ id: string }> };

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function noStore(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0" },
  });
}

export async function GET(_request: Request, { params }: Params) {
  const id = (await params).id;
  if (!UUID_RE.test(id)) {
    return noStore({ error: "Invalid scan id." }, 400);
  }
  try {
    const sql = getSql();
    const exists = await sql`
      SELECT id, active_checks_status, attack_surface_summary
      FROM scans WHERE id = ${id} LIMIT 1
    `;
    if (!exists[0]) return noStore({ error: "Scan not found." }, 404);

    const events = await sql`
      SELECT id, message, created_at
      FROM scan_events
      WHERE scan_id = ${id}
        AND (message ILIKE 'fuzzing.%' OR message ILIKE 'verification.%' OR message ILIKE 'active_checks.%')
      ORDER BY created_at ASC
    `;

    const tested = await sql`
      SELECT count(*)::int AS n FROM scan_attack_surface
      WHERE scan_id = ${id} AND tested = true
    `;
    const fetched = await sql`
      SELECT count(*)::int AS n FROM scan_attack_surface
      WHERE scan_id = ${id} AND fetched = true
    `;

    return noStore({
      scanId: id,
      activeChecksStatus: exists[0].active_checks_status ?? null,
      summary: exists[0].attack_surface_summary ?? null,
      fetched: fetched[0]?.n ?? 0,
      tested: tested[0]?.n ?? 0,
      events: events.map((e) => ({
        id: e.id,
        message: e.message,
        createdAt: e.created_at,
      })),
    });
  } catch (error) {
    console.error("fuzzing get failed", error);
    return noStore({ error: "Could not load fuzzing status." }, 500);
  }
}
