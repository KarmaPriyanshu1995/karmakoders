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

export async function GET(request: Request, { params }: Params) {
  const id = (await params).id;
  if (!UUID_RE.test(id)) {
    return noStore({ error: "Invalid scan id." }, 400);
  }

  const url = new URL(request.url);
  const typeFilter = (url.searchParams.get("type") || "all").toLowerCase();
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit") || 100), 1), 500);
  const offset = Math.max(Number(url.searchParams.get("offset") || 0), 0);

  try {
    const sql = getSql();
    const scans = await sql`
      SELECT id, attack_surface_summary, active_checks_status
      FROM scans WHERE id = ${id} LIMIT 1
    `;
    if (!scans[0]) {
      return noStore({ error: "Scan not found." }, 404);
    }

    const rows =
      typeFilter === "all"
        ? await sql`
            SELECT
              id, url, host, path, method, source, endpoint_type, content_type,
              status_code, parameters, is_external, is_gated, test_status,
              fetched, tested, skip_reason, metadata, discovered_at, last_tested_at
            FROM scan_attack_surface
            WHERE scan_id = ${id}
            ORDER BY discovered_at ASC
            LIMIT ${limit} OFFSET ${offset}
          `
        : await sql`
            SELECT
              id, url, host, path, method, source, endpoint_type, content_type,
              status_code, parameters, is_external, is_gated, test_status,
              fetched, tested, skip_reason, metadata, discovered_at, last_tested_at
            FROM scan_attack_surface
            WHERE scan_id = ${id} AND endpoint_type = ${typeFilter}
            ORDER BY discovered_at ASC
            LIMIT ${limit} OFFSET ${offset}
          `;

    const countRows = await sql`
      SELECT count(*)::int AS n FROM scan_attack_surface WHERE scan_id = ${id}
    `;

    return noStore({
      scanId: id,
      summary: scans[0].attack_surface_summary ?? null,
      activeChecksStatus: scans[0].active_checks_status ?? null,
      total: countRows[0]?.n ?? 0,
      limit,
      offset,
      items: rows.map((r) => ({
        id: r.id,
        url: r.url,
        host: r.host,
        path: r.path,
        method: r.method,
        source: r.source,
        endpointType: r.endpoint_type,
        contentType: r.content_type,
        statusCode: r.status_code,
        parameters: r.parameters ?? [],
        isExternal: r.is_external,
        isGated: r.is_gated,
        testStatus: r.test_status,
        fetched: r.fetched,
        tested: r.tested,
        skipReason: r.skip_reason,
        metadata: r.metadata ?? {},
        discoveredAt: r.discovered_at,
        lastTestedAt: r.last_tested_at,
      })),
    });
  } catch (error) {
    console.error("attack-surface get failed", error);
    return noStore({ error: "Could not load attack surface." }, 500);
  }
}
