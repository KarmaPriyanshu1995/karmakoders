import { NextResponse } from "next/server";
import { getSql } from "@/lib/scanner/db";
import { githubAppMode, githubInstallUrl } from "@/lib/scanner/github";

export const dynamic = "force-dynamic";

type Body = {
  projectId?: string;
  method?: string;
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Start GitHub App connection for a project.
 * In mock mode, creates a synthetic installation + fixture repo for local/E2E.
 */
export async function POST(request: Request) {
  const mode = githubAppMode();
  if (mode === "disabled") {
    return NextResponse.json(
      { error: "GitHub App is not configured. Set GITHUB_APP_ENABLED / GITHUB_APP_MODE." },
      { status: 503 }
    );
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Expected JSON body." }, { status: 400 });
  }

  let projectId = body.projectId;
  if (projectId && !UUID_RE.test(projectId)) {
    return NextResponse.json({ error: "Valid projectId is required." }, { status: 400 });
  }

  try {
    const sql = getSql();
    if (!projectId) {
      const inserted = await sql`
        INSERT INTO projects (name, primary_url)
        VALUES ('GitHub project', 'https://github.com/')
        RETURNING id
      `;
      projectId = String(inserted[0].id);
    }

    const projects = await sql`SELECT id, name FROM projects WHERE id = ${projectId} LIMIT 1`;
    if (!projects[0]) {
      return NextResponse.json({ error: "Project not found." }, { status: 404 });
    }

    if (mode === "mock") {
      const installationGithubId = 900001;
      const inst = await sql`
        INSERT INTO github_installations (
          project_id, installation_id, account_login, account_type, status, suspended, metadata
        ) VALUES (
          ${projectId}, ${installationGithubId}, 'mock-user', 'User', 'active', false,
          ${JSON.stringify({ mode: "mock" })}::jsonb
        )
        ON CONFLICT (project_id, installation_id) DO UPDATE SET
          status = 'active',
          suspended = false,
          updated_at = now()
        RETURNING id, installation_id, account_login, status
      `;

      const repo = await sql`
        INSERT INTO github_repos (
          installation_id, project_id, owner, name, full_name, default_branch,
          private, html_url, selected, metadata
        ) VALUES (
          ${inst[0].id}, ${projectId}, 'mock-user', 'phase-g-fixture', 'mock-user/phase-g-fixture',
          'main', true, 'https://github.com/mock-user/phase-g-fixture', true,
          ${JSON.stringify({ fixture: true })}::jsonb
        )
        ON CONFLICT (project_id, full_name) DO UPDATE SET
          selected = true,
          installation_id = EXCLUDED.installation_id,
          updated_at = now()
        RETURNING id, full_name, private, selected
      `;

      return NextResponse.json({
        mode: "mock",
        status: "connected",
        projectId,
        installationId: inst[0].installation_id,
        accountLogin: inst[0].account_login,
        repos: [
          {
            id: repo[0].id,
            fullName: repo[0].full_name,
            private: repo[0].private,
            selected: repo[0].selected,
          },
        ],
        message:
          "Mock GitHub installation linked for local testing. No real GitHub credentials used.",
      });
    }

    const installUrl = githubInstallUrl();
    if (!installUrl) {
      return NextResponse.json(
        { error: "GITHUB_APP_SLUG is required to start the install flow." },
        { status: 503 }
      );
    }

    // Persist pending marker on project metadata via a placeholder installation row if needed.
    return NextResponse.json({
      mode,
      status: "install_required",
      installUrl: `${installUrl}?state=${encodeURIComponent(projectId)}`,
      message: "Install the GitHub App on the repositories you want to scan, then return here.",
    });
  } catch (error) {
    console.error("github connect failed", error);
    return NextResponse.json({ error: "Could not start GitHub connection." }, { status: 500 });
  }
}
