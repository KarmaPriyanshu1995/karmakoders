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
    const rows = await sql`
      SELECT
        id, type, repo_full_name, repo_commit_sha, github_scan_status, repo_scan_summary
      FROM scans WHERE id = ${id} LIMIT 1
    `;
    if (!rows[0]) return noStore({ error: "Scan not found." }, 404);
    if (rows[0].type !== "repo") {
      return noStore({ error: "Not a repository scan." }, 400);
    }
    const summary = rows[0].repo_scan_summary || {};
    const inventory = (summary as { inventory?: unknown }).inventory ?? null;
    return noStore({
      scanId: id,
      repoFullName: rows[0].repo_full_name,
      commitSha: rows[0].repo_commit_sha,
      githubScanStatus: rows[0].github_scan_status,
      summary,
      inventory,
      cveClaims: false,
      note: "Dependency inventory only — no vulnerability database consulted.",
    });
  } catch (error) {
    console.error("repo-inventory failed", error);
    return noStore({ error: "Could not load inventory." }, 500);
  }
}
