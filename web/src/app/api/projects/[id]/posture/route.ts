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

export async function GET(_request: Request, { params }: Params) {
  const projectId = params.id;
  if (!UUID_RE.test(projectId)) {
    return noStore({ error: "Invalid project id." }, 400);
  }
  const sql = getSql();
  try {
    const projects = await sql`
      SELECT id, name, primary_url FROM projects WHERE id = ${projectId} LIMIT 1
    `;
    const project = projects[0];
    if (!project) {
      return noStore({ error: "Project not found." }, 404);
    }

    const latest = await sql`
      SELECT id, status, grade, finished_at, type, repo_full_name
      FROM scans
      WHERE project_id = ${projectId} AND status = 'done'
      ORDER BY finished_at DESC NULLS LAST
      LIMIT 1
    `;
    const last = latest[0] ?? null;

    const openCounts = await sql`
      SELECT
        COUNT(*) FILTER (WHERE severity = 'critical')::int AS critical,
        COUNT(*) FILTER (WHERE severity = 'high')::int AS high,
        COUNT(*)::int AS open_total
      FROM project_finding_states
      WHERE project_id = ${projectId} AND state = 'open'
    `;

    const schedules = await sql`
      SELECT id, cadence, enabled, next_run_at, target_type
      FROM scan_schedules
      WHERE project_id = ${projectId} AND enabled = true
      ORDER BY next_run_at ASC
      LIMIT 5
    `;

    let diff = null;
    if (last?.id) {
      const diffs = await sql`
        SELECT new_count, fixed_count, unresolved_count, regression_count,
               grade_previous, grade_current, diff_status
        FROM scan_diffs WHERE scan_id = ${last.id} LIMIT 1
      `;
      diff = diffs[0] ?? null;
    }

    return noStore({
      projectId: project.id,
      name: project.name,
      primaryUrl: project.primary_url,
      lastScan: last
        ? {
            id: last.id,
            status: last.status,
            grade: last.grade,
            finishedAt: last.finished_at,
            type: last.type,
            repoFullName: last.repo_full_name,
          }
        : null,
      openCritical: openCounts[0]?.critical ?? 0,
      openHigh: openCounts[0]?.high ?? 0,
      openTotal: openCounts[0]?.open_total ?? 0,
      nextSchedules: schedules.map((s) => ({
        id: s.id,
        cadence: s.cadence,
        nextRunAt: s.next_run_at,
        targetType: s.target_type,
      })),
      latestDiff: diff
        ? {
            status: diff.diff_status,
            newCount: diff.new_count,
            fixedCount: diff.fixed_count,
            unresolvedCount: diff.unresolved_count,
            regressionCount: diff.regression_count,
            gradePrevious: diff.grade_previous,
            gradeCurrent: diff.grade_current,
          }
        : null,
    });
  } catch (error) {
    console.error("posture failed", error);
    return noStore({ error: "Could not load posture." }, 500);
  }
}
