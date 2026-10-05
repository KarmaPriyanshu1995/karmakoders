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
    headers: { "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0" },
  });
}

/** Endpoints subset of attack surface (api/form/page/auth). */
export async function GET(request: Request, { params }: Params) {
  const id = params.id;
  if (!UUID_RE.test(id)) {
    return noStore({ error: "Invalid scan id." }, 400);
  }
  const url = new URL(request.url);
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit") || 100), 1), 500);
  const offset = Math.max(Number(url.searchParams.get("offset") || 0), 0);

  try {
    const sql = getSql();
    const exists = await sql`SELECT id FROM scans WHERE id = ${id} LIMIT 1`;
    if (!exists[0]) return noStore({ error: "Scan not found." }, 404);

    const rows = await sql`
      SELECT
        id, url, method, source, endpoint_type, status_code, content_type,
        parameters, test_status, fetched, tested, skip_reason, is_gated
      FROM scan_attack_surface
      WHERE scan_id = ${id}
        AND endpoint_type IN ('api', 'form', 'page', 'authentication', 'documentation')
        AND is_external = false
      ORDER BY endpoint_type, path
      LIMIT ${limit} OFFSET ${offset}
    `;
    return noStore({
      scanId: id,
      limit,
      offset,
      items: rows.map((r) => ({
        id: r.id,
        url: r.url,
        method: r.method,
        source: r.source,
        endpointType: r.endpoint_type,
        statusCode: r.status_code,
        contentType: r.content_type,
        parameters: r.parameters ?? [],
        testStatus: r.test_status,
        fetched: r.fetched,
        tested: r.tested,
        skipReason: r.skip_reason,
        isGated: r.is_gated,
      })),
    });
  } catch (error) {
    console.error("endpoints get failed", error);
    return noStore({ error: "Could not load endpoints." }, 500);
  }
}
