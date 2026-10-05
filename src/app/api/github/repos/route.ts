import { NextResponse } from "next/server";
import { getSql } from "@/lib/scanner/db";
import { githubAppMode } from "@/lib/scanner/github";

export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** List authorized repos for a project only (cross-project isolation). */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const projectId = url.searchParams.get("projectId");
  if (!projectId || !UUID_RE.test(projectId)) {
    return NextResponse.json({ error: "Valid projectId is required." }, { status: 400 });
  }

  if (githubAppMode() === "disabled") {
    return NextResponse.json({ error: "GitHub App disabled.", items: [] }, { status: 503 });
  }

  try {
    const sql = getSql();
    const rows = await sql`
      SELECT
        r.id, r.owner, r.name, r.full_name, r.default_branch, r.private, r.selected, r.html_url,
        i.status AS installation_status, i.suspended
      FROM github_repos r
      JOIN github_installations i ON i.id = r.installation_id
      WHERE r.project_id = ${projectId}
        AND i.project_id = ${projectId}
        AND i.status = 'active'
        AND i.suspended = false
        AND r.selected = true
      ORDER BY r.full_name ASC
      LIMIT 200
    `;

    return NextResponse.json({
      projectId,
      items: rows.map((r) => ({
        id: r.id,
        owner: r.owner,
        name: r.name,
        fullName: r.full_name,
        defaultBranch: r.default_branch,
        private: r.private,
        selected: r.selected,
        htmlUrl: r.html_url,
      })),
    });
  } catch (error) {
    console.error("github repos failed", error);
    return NextResponse.json({ error: "Could not list repositories." }, { status: 500 });
  }
}
