import { NextResponse } from "next/server";
import { getSql } from "@/lib/scanner/db";
import { githubAppMode } from "@/lib/scanner/github";

export const dynamic = "force-dynamic";

type Body = {
  projectId?: string;
  repo?: string; // owner/name or https://github.com/owner/name
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function parseRepoRef(raw: string): { owner: string; name: string } | null {
  const trimmed = raw.trim().replace(/\.git$/i, "");
  const urlMatch = trimmed.match(
    /^https?:\/\/(?:www\.)?github\.com\/([^/\s]+)\/([^/\s#?]+)/i
  );
  if (urlMatch) {
    return { owner: urlMatch[1], name: urlMatch[2] };
  }
  const short = trimmed.match(/^([^/\s]+)\/([^/\s]+)$/);
  if (short) {
    return { owner: short[1], name: short[2] };
  }
  return null;
}

/**
 * Authorize a PUBLIC GitHub repository for scanning without a GitHub App install.
 * Private repos still require a real GitHub App / PAT.
 */
export async function POST(request: Request) {
  if (githubAppMode() === "disabled") {
    return NextResponse.json(
      { error: "GitHub scanning is not configured." },
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
  if (!body.repo || typeof body.repo !== "string") {
    return NextResponse.json(
      { error: "Paste a public GitHub URL or owner/name (e.g. vercel/next.js)." },
      { status: 400 }
    );
  }

  const parsed = parseRepoRef(body.repo);
  if (!parsed) {
    return NextResponse.json(
      { error: "Could not parse repository. Use owner/name or https://github.com/owner/name." },
      { status: 400 }
    );
  }

  const { owner, name } = parsed;
  const fullName = `${owner}/${name}`;

  try {
    // Verify the repo exists and is public via GitHub API (no token).
    const ghRes = await fetch(`https://api.github.com/repos/${owner}/${name}`, {
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "KarmaKoders-Scanner",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      cache: "no-store",
    });
    if (ghRes.status === 404) {
      return NextResponse.json(
        { error: "Repository not found (or it is private). Private repos need a GitHub App." },
        { status: 404 }
      );
    }
    if (!ghRes.ok) {
      return NextResponse.json(
        { error: `GitHub API error (${ghRes.status}). Try again shortly.` },
        { status: 502 }
      );
    }
    const meta = (await ghRes.json()) as {
      private?: boolean;
      default_branch?: string;
      html_url?: string;
      full_name?: string;
    };
    if (meta.private) {
      return NextResponse.json(
        {
          error:
            "That repository is private. Connect a real GitHub App (GITHUB_APP_MODE=app) to scan private repos.",
        },
        { status: 403 }
      );
    }

    const sql = getSql();
    if (!projectId) {
      const inserted = await sql`
        INSERT INTO projects (name, primary_url)
        VALUES (${fullName}, ${meta.html_url || `https://github.com/${fullName}`})
        RETURNING id
      `;
      projectId = String(inserted[0].id);
    }

    // One "public" installation per project (synthetic installation_id).
    const publicInstallId = 800001;
    const inst = await sql`
      INSERT INTO github_installations (
        project_id, installation_id, account_login, account_type, status, suspended, metadata
      ) VALUES (
        ${projectId}, ${publicInstallId}, ${owner}, 'User', 'active', false,
        ${JSON.stringify({ mode: "public_readonly" })}::jsonb
      )
      ON CONFLICT (project_id, installation_id) DO UPDATE SET
        status = 'active',
        suspended = false,
        account_login = EXCLUDED.account_login,
        updated_at = now()
      RETURNING id, installation_id, account_login, status
    `;

    const repo = await sql`
      INSERT INTO github_repos (
        installation_id, project_id, owner, name, full_name, default_branch,
        private, html_url, selected, metadata
      ) VALUES (
        ${inst[0].id}, ${projectId}, ${owner}, ${name}, ${fullName},
        ${meta.default_branch || "main"}, false,
        ${meta.html_url || `https://github.com/${fullName}`}, true,
        ${JSON.stringify({ source: "public_url", verified_public: true })}::jsonb
      )
      ON CONFLICT (project_id, full_name) DO UPDATE SET
        selected = true,
        private = false,
        default_branch = EXCLUDED.default_branch,
        html_url = EXCLUDED.html_url,
        installation_id = EXCLUDED.installation_id,
        updated_at = now()
      RETURNING id, full_name, private, selected, default_branch, html_url
    `;

    return NextResponse.json({
      status: "connected",
      mode: "public",
      projectId,
      repo: {
        id: repo[0].id,
        fullName: repo[0].full_name,
        private: repo[0].private,
        selected: repo[0].selected,
        defaultBranch: repo[0].default_branch,
        htmlUrl: repo[0].html_url,
      },
      message: `Public repository ${fullName} authorized for this project. Private repos still need a GitHub App.`,
    });
  } catch (error) {
    console.error("add public repo failed", error);
    return NextResponse.json({ error: "Could not authorize that repository." }, { status: 500 });
  }
}
