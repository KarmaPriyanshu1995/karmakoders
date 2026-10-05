import { NextResponse } from "next/server";
import { getSql } from "@/lib/scanner/db";

export const dynamic = "force-dynamic";

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
  const scanId = (await params).id;
  if (!UUID_RE.test(scanId)) {
    return noStore({ error: "Invalid scan id." }, 400);
  }
  const sql = getSql();
  try {
    const rows = await sql`
      SELECT
        d.scan_id,
        d.project_id,
        d.compared_to_scan_id,
        d.diff_status,
        d.new_fingerprints,
        d.unresolved_fingerprints,
        d.fixed_fingerprints,
        d.regression_fingerprints,
        d.new_count,
        d.unresolved_count,
        d.fixed_count,
        d.regression_count,
        d.grade_previous,
        d.grade_current,
        d.summary,
        d.computed_at
      FROM scan_diffs d
      WHERE d.scan_id = ${scanId}
      LIMIT 1
    `;
    const row = rows[0];
    if (!row) {
      return noStore({
        scanId,
        diffStatus: "pending",
        newCount: 0,
        unresolvedCount: 0,
        fixedCount: 0,
        regressionCount: 0,
        newFingerprints: [],
        unresolvedFingerprints: [],
        fixedFingerprints: [],
        regressionFingerprints: [],
        gradePrevious: null,
        gradeCurrent: null,
      });
    }
    return noStore({
      scanId: row.scan_id,
      projectId: row.project_id,
      comparedToScanId: row.compared_to_scan_id,
      diffStatus: row.diff_status,
      newFingerprints: row.new_fingerprints ?? [],
      unresolvedFingerprints: row.unresolved_fingerprints ?? [],
      fixedFingerprints: row.fixed_fingerprints ?? [],
      regressionFingerprints: row.regression_fingerprints ?? [],
      newCount: row.new_count,
      unresolvedCount: row.unresolved_count,
      fixedCount: row.fixed_count,
      regressionCount: row.regression_count,
      gradePrevious: row.grade_previous,
      gradeCurrent: row.grade_current,
      summary: row.summary,
      computedAt: row.computed_at,
    });
  } catch (error) {
    console.error("scan diff failed", error);
    return noStore({ error: "Could not load diff." }, 500);
  }
}
