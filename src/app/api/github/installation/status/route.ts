import { NextResponse } from "next/server";
import { getSql } from "@/lib/scanner/db";
import { githubAppMode, githubInstallUrl } from "@/lib/scanner/github";

export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const projectId = url.searchParams.get("projectId");
  if (!projectId || !UUID_RE.test(projectId)) {
    return NextResponse.json({ error: "Valid projectId is required." }, { status: 400 });
  }

  const mode = githubAppMode();
  try {
    const sql = getSql();
    const installs = await sql`
      SELECT id, installation_id, account_login, account_type, status, suspended, updated_at
      FROM github_installations
      WHERE project_id = ${projectId}
      ORDER BY updated_at DESC
      LIMIT 5
    `;

    const active = installs.find(
      (i) => String(i.status) === "active" && !i.suspended
    );

    const repos = active
      ? await sql`
          SELECT id, owner, name, full_name, default_branch, private, selected, html_url
          FROM github_repos
          WHERE project_id = ${projectId}
            AND installation_id = ${active.id}
          ORDER BY full_name ASC
        `
      : [];

    return NextResponse.json({
      mode,
      enabled: mode !== "disabled",
      installUrl: githubInstallUrl(),
      status: active ? "connected" : installs[0] ? String(installs[0].status) : "disconnected",
      installation: active
        ? {
            installationId: active.installation_id,
            accountLogin: active.account_login,
            accountType: active.account_type,
            status: active.status,
          }
        : null,
      repoCount: repos.length,
    });
  } catch (error) {
    console.error("github status failed", error);
    return NextResponse.json({ error: "Could not load GitHub status." }, { status: 500 });
  }
}
