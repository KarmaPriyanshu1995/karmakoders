import { NextResponse } from "next/server";
import { getSql } from "@/lib/db";
import { normalizeHost } from "@/lib/ownership";

export const dynamic = "force-dynamic";

type Body = {
  url?: string;
  type?: "url" | "repo";
  projectId?: string;
  repoId?: string;
  owner?: string;
  name?: string;
  fullName?: string;
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function normalizeUrl(raw: string): URL {
  const trimmed = raw.trim();
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  const parsed = new URL(withScheme);
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("URL must use http or https.");
  }
  if (!parsed.hostname) {
    throw new Error("URL is missing a hostname.");
  }
  return parsed;
}

async function createUrlScan(body: Body) {
  if (!body.url || typeof body.url !== "string") {
    return NextResponse.json({ error: "Paste an app URL to scan." }, { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = normalizeUrl(body.url);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid URL.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const primaryUrl = parsed.toString();
  const name = parsed.hostname;
  // Exact host: a verified apex must not unlock www (or vice versa).
  const host = normalizeHost(parsed.hostname);

  const sql = getSql();

  const owned = await sql`
    SELECT p.id
    FROM projects p
    JOIN verified_domains vd ON vd.project_id = p.id
    WHERE p.user_id IS NULL
      AND lower(vd.domain) = ${host}
      AND (
        vd.status = 'verified'
        OR (vd.verified_at IS NOT NULL AND (vd.status IS NULL OR vd.status = 'verified'))
      )
      AND (vd.verified_expires_at IS NULL OR vd.verified_expires_at > now())
    ORDER BY vd.verified_at DESC NULLS LAST
    LIMIT 1
  `;

  let projectId: string | null = owned[0]?.id ? String(owned[0].id) : null;

  if (!projectId) {
    const inserted = await sql`
      INSERT INTO projects (name, primary_url)
      VALUES (${name}, ${primaryUrl})
      RETURNING id
    `;
    projectId = String(inserted[0].id);
  } else {
    await sql`
      UPDATE projects
      SET primary_url = ${primaryUrl}, name = ${name}
      WHERE id = ${projectId}
    `;
  }

  const created = await sql`
    WITH scan AS (
      INSERT INTO scans (project_id, type, status, github_scan_status, trigger_source)
      VALUES (${projectId}, 'url', 'queued', 'not_applicable', 'manual')
      RETURNING id, project_id, status
    ),
    job AS (
      INSERT INTO scan_jobs (scan_id, status)
      SELECT id, 'queued' FROM scan
      RETURNING id
    ),
    event AS (
      INSERT INTO scan_events (scan_id, message)
      SELECT id, 'Queued — waiting for the worker' FROM scan
      RETURNING id
    )
    SELECT scan.id AS scan_id, scan.project_id, scan.status
    FROM scan
  `;

  const row = created[0];
  if (!row) {
    return NextResponse.json({ error: "Could not create the scan." }, { status: 500 });
  }

  return NextResponse.json({
    scanId: row.scan_id,
    projectId: row.project_id,
    status: row.status,
    type: "url",
  });
}

async function createRepoScan(body: Body) {
  if (!body.projectId || !UUID_RE.test(body.projectId)) {
    return NextResponse.json(
      { error: "projectId is required for repository scans." },
      { status: 400 }
    );
  }

  const sql = getSql();
  const projectId = body.projectId;

  const projects = await sql`SELECT id FROM projects WHERE id = ${projectId} LIMIT 1`;
  if (!projects[0]) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  let repoRows;
  if (body.repoId && UUID_RE.test(body.repoId)) {
    repoRows = await sql`
      SELECT r.id, r.full_name, r.owner, r.name, r.html_url,
             i.status, i.suspended, i.project_id
      FROM github_repos r
      JOIN github_installations i ON i.id = r.installation_id
      WHERE r.id = ${body.repoId}
        AND r.project_id = ${projectId}
        AND i.project_id = ${projectId}
      LIMIT 1
    `;
  } else {
    const full =
      body.fullName ||
      (body.owner && body.name ? `${body.owner}/${body.name}` : null);
    if (!full) {
      return NextResponse.json(
        { error: "Provide repoId or owner/name for the repository scan." },
        { status: 400 }
      );
    }
    repoRows = await sql`
      SELECT r.id, r.full_name, r.owner, r.name, r.html_url,
             i.status, i.suspended, i.project_id
      FROM github_repos r
      JOIN github_installations i ON i.id = r.installation_id
      WHERE r.project_id = ${projectId}
        AND i.project_id = ${projectId}
        AND lower(r.full_name) = ${full.toLowerCase()}
      LIMIT 1
    `;
  }

  const repo = repoRows[0];
  if (!repo) {
    return NextResponse.json(
      { error: "Repository is not authorized for this project." },
      { status: 403 }
    );
  }
  if (repo.suspended || String(repo.status) !== "active") {
    return NextResponse.json(
      { error: "GitHub installation is not active for this repository." },
      { status: 403 }
    );
  }

  const primaryUrl =
    repo.html_url || `https://github.com/${repo.full_name}`;

  await sql`
    UPDATE projects
    SET primary_url = ${primaryUrl}, name = ${repo.full_name}
    WHERE id = ${projectId}
  `;

  const created = await sql`
    WITH scan AS (
      INSERT INTO scans (
        project_id, type, status, github_repo_id, repo_full_name, github_scan_status,
        trigger_source
      ) VALUES (
        ${projectId}, 'repo', 'queued', ${repo.id}, ${repo.full_name}, NULL,
        'manual'
      )
      RETURNING id, project_id, status
    ),
    job AS (
      INSERT INTO scan_jobs (scan_id, status)
      SELECT id, 'queued' FROM scan
      RETURNING id
    ),
    event AS (
      INSERT INTO scan_events (scan_id, message)
      SELECT id, 'Queued — repository scan waiting for the worker' FROM scan
      RETURNING id
    )
    SELECT scan.id AS scan_id, scan.project_id, scan.status
    FROM scan
  `;

  const row = created[0];
  if (!row) {
    return NextResponse.json({ error: "Could not create the scan." }, { status: 500 });
  }

  return NextResponse.json({
    scanId: row.scan_id,
    projectId: row.project_id,
    status: row.status,
    type: "repo",
    repoFullName: repo.full_name,
  });
}

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Expected JSON body." }, { status: 400 });
  }

  try {
    if (body.type === "repo") {
      return await createRepoScan(body);
    }
    return await createUrlScan(body);
  } catch (error) {
    console.error("create scan failed", error);
    return NextResponse.json({ error: "Could not create the scan." }, { status: 500 });
  }
}
