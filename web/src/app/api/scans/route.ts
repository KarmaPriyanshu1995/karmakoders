import { NextResponse } from "next/server";
import { getSql } from "@/lib/db";
import { normalizeHost } from "@/lib/ownership";

export const dynamic = "force-dynamic";

type Body = {
  url?: string;
};

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

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Expected JSON body with a url." }, { status: 400 });
  }

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
  const host = normalizeHost(parsed.hostname);
  const apex = host.startsWith("www.") ? host.slice(4) : host;
  const www = host.startsWith("www.") ? host : `www.${host}`;

  try {
    const sql = getSql();

    // Prefer an existing project that already verified this host so active checks can run
    // on the next scan after ownership proof (anonymous projects only).
    const owned = await sql`
      SELECT p.id
      FROM projects p
      JOIN verified_domains vd ON vd.project_id = p.id
      WHERE p.user_id IS NULL
        AND lower(vd.domain) IN (${host}, ${apex}, ${www})
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
      // Keep primary_url fresh for the verified project
      await sql`
        UPDATE projects
        SET primary_url = ${primaryUrl}, name = ${name}
        WHERE id = ${projectId}
      `;
    }

    const created = await sql`
      WITH scan AS (
        INSERT INTO scans (project_id, type, status)
        VALUES (${projectId}, 'url', 'queued')
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
    });
  } catch (error) {
    console.error("create scan failed", error);
    return NextResponse.json({ error: "Could not create the scan." }, { status: 500 });
  }
}
