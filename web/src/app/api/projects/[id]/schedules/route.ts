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

function nextRunAt(cadence: string): Date {
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  if (cadence === "weekly") return new Date(now + 7 * day);
  if (cadence === "monthly") return new Date(now + 30 * day);
  return new Date(now + day);
}

export async function GET(_request: Request, { params }: Params) {
  const projectId = params.id;
  if (!UUID_RE.test(projectId)) {
    return noStore({ error: "Invalid project id." }, 400);
  }
  const sql = getSql();
  try {
    const rows = await sql`
      SELECT
        id, project_id, target_type, github_repo_id, cadence, timezone,
        enabled, next_run_at, last_enqueued_at, last_scan_id, created_at, updated_at
      FROM scan_schedules
      WHERE project_id = ${projectId}
      ORDER BY created_at DESC
    `;
    return noStore({
      items: rows.map((r) => ({
        id: r.id,
        projectId: r.project_id,
        targetType: r.target_type,
        githubRepoId: r.github_repo_id,
        cadence: r.cadence,
        timezone: r.timezone,
        enabled: r.enabled,
        nextRunAt: r.next_run_at,
        lastEnqueuedAt: r.last_enqueued_at,
        lastScanId: r.last_scan_id,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      })),
    });
  } catch (error) {
    console.error("list schedules failed", error);
    return noStore({ error: "Could not list schedules." }, 500);
  }
}

export async function POST(request: Request, { params }: Params) {
  const projectId = params.id;
  if (!UUID_RE.test(projectId)) {
    return noStore({ error: "Invalid project id." }, 400);
  }
  let body: {
    targetType?: string;
    cadence?: string;
    githubRepoId?: string;
    timezone?: string;
    enabled?: boolean;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return noStore({ error: "Expected JSON body." }, 400);
  }

  const targetType = body.targetType === "repo" ? "repo" : "url";
  const cadence = ["daily", "weekly", "monthly"].includes(String(body.cadence))
    ? String(body.cadence)
    : "weekly";
  const timezone = (body.timezone || "UTC").slice(0, 64);
  const enabled = body.enabled !== false;

  const sql = getSql();
  try {
    const project = await sql`SELECT id FROM projects WHERE id = ${projectId} LIMIT 1`;
    if (!project[0]) {
      return noStore({ error: "Project not found." }, 404);
    }

    let githubRepoId: string | null = null;
    if (targetType === "repo") {
      if (!body.githubRepoId || !UUID_RE.test(body.githubRepoId)) {
        return noStore({ error: "githubRepoId required for repo schedules." }, 400);
      }
      const repos = await sql`
        SELECT id FROM github_repos
        WHERE id = ${body.githubRepoId} AND project_id = ${projectId}
        LIMIT 1
      `;
      if (!repos[0]) {
        return noStore({ error: "Repository not authorized for this project." }, 403);
      }
      githubRepoId = body.githubRepoId;
    }

    const next = nextRunAt(cadence);
    const inserted = await sql`
      INSERT INTO scan_schedules (
        project_id, target_type, github_repo_id, cadence, timezone,
        enabled, next_run_at
      )
      VALUES (
        ${projectId},
        ${targetType},
        ${githubRepoId},
        ${cadence},
        ${timezone},
        ${enabled},
        ${next.toISOString()}
      )
      RETURNING id, next_run_at, enabled, cadence, target_type
    `;
    const row = inserted[0];
    return noStore({
      id: row.id,
      projectId,
      targetType: row.target_type,
      cadence: row.cadence,
      enabled: row.enabled,
      nextRunAt: row.next_run_at,
    });
  } catch (error) {
    console.error("create schedule failed", error);
    return noStore({ error: "Could not create schedule." }, 500);
  }
}
