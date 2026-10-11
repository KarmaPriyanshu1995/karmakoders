import { NextResponse } from "next/server";
import { getSql } from "@/lib/scanner/db";
import { summarizeDashboard } from "@/lib/scanner/dashboard";

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

// Read-only aggregate for the Security dashboard. Reads existing tables only; no writes,
// no new tables, and no second security grade (the grade comes from the last scan as-is).
export async function GET(_request: Request, { params }: Params) {
  const projectId = (await params).id;
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

    const scanCountRows = await sql`
      SELECT COUNT(*)::int AS n FROM scans WHERE project_id = ${projectId}
    `;

    const lastDone = await sql`
      SELECT id, grade, status, finished_at
      FROM scans
      WHERE project_id = ${projectId} AND status = 'done'
      ORDER BY finished_at DESC NULLS LAST, id DESC
      LIMIT 1
    `;
    const lastDoneScan = lastDone[0] ?? null;

    const states = await sql`
      SELECT state, severity, category
      FROM project_finding_states
      WHERE project_id = ${projectId}
    `;

    const latestFindings = lastDoneScan
      ? await sql`
          SELECT severity, category, finding_type, scanner_source, verification_status
          FROM findings
          WHERE scan_id = ${lastDoneScan.id}
        `
      : [];

    const recentScans = await sql`
      SELECT id, type, status, grade, started_at, finished_at
      FROM scans
      WHERE project_id = ${projectId}
      ORDER BY finished_at DESC NULLS LAST, id DESC
      LIMIT 8
    `;

    const apiEventRows = lastDoneScan
      ? await sql`
          SELECT message FROM scan_events
          WHERE scan_id = ${lastDoneScan.id} AND message LIKE 'api_security.inventory%'
          ORDER BY created_at DESC LIMIT 1
        `
      : [];

    const data = summarizeDashboard({
      project: { id: project.id, name: project.name, primary_url: project.primary_url },
      scanCount: scanCountRows[0]?.n ?? 0,
      states: states as never,
      latestFindings: latestFindings as never,
      recentScans: recentScans as never,
      lastDoneScan: lastDoneScan as never,
      apiSecurityEvent: apiEventRows[0]?.message ?? null,
    });
    return noStore(data);
  } catch (error) {
    console.error("dashboard failed", error);
    return noStore({ error: "Could not load dashboard." }, 500);
  }
}
