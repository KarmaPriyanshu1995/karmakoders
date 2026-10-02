import { NextResponse } from "next/server";
import { getSql } from "@/lib/db";
import {
  HTTP_PATH,
  TXT_PREFIX,
  hostsEquivalent,
  instructionsFor,
  normalizeHost,
  type OwnershipMethod,
} from "@/lib/ownership";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function noStore(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0" },
  });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId");
  if (!projectId || !UUID_RE.test(projectId)) {
    return noStore({ error: "Valid projectId query param is required." }, 400);
  }

  try {
    const sql = getSql();
    const projects = await sql`
      SELECT id, primary_url FROM projects WHERE id = ${projectId} LIMIT 1
    `;
    const project = projects[0];
    if (!project) return noStore({ error: "Project not found." }, 404);

    let host = "";
    try {
      host = normalizeHost(new URL(String(project.primary_url)).hostname);
    } catch {
      return noStore({ error: "Invalid project URL." }, 400);
    }

    const rows = await sql`
      SELECT
        id, domain, method, status, verification_token, verified_at,
        challenge_expires_at, verified_expires_at, last_checked_at, failure_reason
      FROM verified_domains
      WHERE project_id = ${projectId}
      ORDER BY created_at DESC NULLS LAST
      LIMIT 5
    `;

    const match =
      rows.find((r) => hostsEquivalent(String(r.domain), host)) ?? rows[0] ?? null;

    if (!match) {
      return noStore({
        projectId,
        domain: host,
        status: "unverified",
        method: null,
        verifiedAt: null,
        challengeExpiresAt: null,
        verifiedExpiresAt: null,
        lastCheckedAt: null,
        failureReason: null,
        instructions: null,
        activeChecksNote:
          "Active checks run only after you verify you control this domain. Passive findings do not require ownership.",
      });
    }

    let status = (match.status as string) || (match.verified_at ? "verified" : "pending");
    if (
      status === "pending" &&
      match.challenge_expires_at &&
      new Date(String(match.challenge_expires_at)).getTime() < Date.now()
    ) {
      status = "expired";
    }
    if (
      status === "verified" &&
      match.verified_expires_at &&
      new Date(String(match.verified_expires_at)).getTime() < Date.now()
    ) {
      status = "expired";
    }

    const method = (match.method || "http_file") as OwnershipMethod;
    const token = String(match.verification_token || "");
    const instructions =
      status === "pending" || status === "failed" || status === "expired"
        ? instructionsFor(method, host, token, `${TXT_PREFIX}${token}`)
        : null;

    return noStore({
      projectId,
      domain: normalizeHost(String(match.domain)),
      status,
      method: match.method,
      verifiedAt: match.verified_at,
      challengeExpiresAt: match.challenge_expires_at,
      verifiedExpiresAt: match.verified_expires_at,
      lastCheckedAt: match.last_checked_at,
      failureReason: match.failure_reason,
      instructions,
      httpPath: HTTP_PATH,
      activeChecksNote:
        status === "verified"
          ? "Ownership verified — deeper active checks can run on future scans."
          : "Active checks run only after you verify you control this domain. Passive findings do not require ownership.",
    });
  } catch (error) {
    console.error("ownership status failed", error);
    return noStore({ error: "Could not load ownership status." }, 500);
  }
}
