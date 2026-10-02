import { NextResponse } from "next/server";
import { getSql } from "@/lib/db";

export const dynamic = "force-dynamic";

type Params = { params: { id: string } };

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function noStore(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0" },
  });
}

export async function GET(request: Request, { params }: Params) {
  const projectId = params.id;
  if (!UUID_RE.test(projectId)) {
    return noStore({ error: "Invalid project id." }, 400);
  }
  const url = new URL(request.url);
  const limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit") || 20)));
  const sql = getSql();
  try {
    const project = await sql`SELECT id FROM projects WHERE id = ${projectId} LIMIT 1`;
    if (!project[0]) {
      return noStore({ error: "Project not found." }, 404);
    }
    const rows = await sql`
      SELECT
        s.id, s.type, s.status, s.grade, s.trigger_source, s.schedule_id,
        s.repo_full_name, s.repo_commit_sha, s.started_at, s.finished_at,
        d.diff_status, d.new_count, d.fixed_count, d.regression_count,
        d.unresolved_count, d.grade_previous
      FROM scans s
      LEFT JOIN scan_diffs d ON d.scan_id = s.id
      WHERE s.project_id = ${projectId}
      ORDER BY s.finished_at DESC NULLS LAST, s.id DESC
      LIMIT ${limit}
    `;
    return noStore({
      items: rows.map((r) => ({
        id: r.id,
        type: r.type,
        status: r.status,
        grade: r.grade,
        triggerSource: r.trigger_source ?? "manual",
        scheduleId: r.schedule_id,
        repoFullName: r.repo_full_name,
        repoCommitSha: r.repo_commit_sha,
        startedAt: r.started_at,
        finishedAt: r.finished_at,
        diff: {
          status: r.diff_status ?? null,
          newCount: r.new_count ?? 0,
          fixedCount: r.fixed_count ?? 0,
          unresolvedCount: r.unresolved_count ?? 0,
          regressionCount: r.regression_count ?? 0,
          gradePrevious: r.grade_previous ?? null,
        },
      })),
    });
  } catch (error) {
    console.error("project scans history failed", error);
    return noStore({ error: "Could not load history." }, 500);
  }
}
