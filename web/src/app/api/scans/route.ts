import { NextResponse } from "next/server";
import { getSql } from "@/lib/db";

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

  try {
    const sql = getSql();
    const created = await sql`
      WITH project AS (
        INSERT INTO projects (name, primary_url)
        VALUES (${name}, ${primaryUrl})
        RETURNING id
      ),
      scan AS (
        INSERT INTO scans (project_id, type, status)
        SELECT id, 'url', 'queued' FROM project
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
