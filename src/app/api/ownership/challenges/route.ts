import { NextResponse } from "next/server";
import { getSql } from "@/lib/scanner/db";
import { isIP } from "net";
import {
  CHALLENGE_TTL_MS,
  hostFromUrl,
  hostIsCname,
  instructionsFor,
  newChallengeToken,
  normalizeHost,
  verificationHostnameFor,
  type OwnershipMethod,
} from "@/lib/scanner/ownership";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Body = {
  projectId?: string;
  method?: OwnershipMethod;
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function noStore(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0" },
  });
}

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return noStore({ error: "Expected JSON body." }, 400);
  }

  if (!body.projectId || !UUID_RE.test(body.projectId)) {
    return noStore({ error: "Valid projectId is required." }, 400);
  }
  const method: OwnershipMethod = body.method === "dns_txt" ? "dns_txt" : "http_file";

  try {
    const sql = getSql();
    const projects = await sql`
      SELECT id, primary_url FROM projects WHERE id = ${body.projectId} LIMIT 1
    `;
    const project = projects[0];
    if (!project) return noStore({ error: "Project not found." }, 404);

    // Claimed host = exactly the project's host. www is never folded into the apex.
    let domain: string;
    try {
      domain = hostFromUrl(String(project.primary_url));
    } catch {
      return noStore({ error: "Project URL is invalid." }, 400);
    }
    if (method === "dns_txt" && (isIP(domain) || !domain.includes("."))) {
      return noStore({ error: "DNS TXT verification needs a domain name. Use file verification for this host." }, 400);
    }
    const verificationHostname = method === "dns_txt" ? verificationHostnameFor(domain) : null;

    const challenge = newChallengeToken();
    const expiresAt = new Date(Date.now() + CHALLENGE_TTL_MS).toISOString();

    // Product rule: ownership is per-project. Upsert this project's claim only.
    const rows = await sql`
      INSERT INTO verified_domains (
        project_id, domain, verification_token, method, status, token_hash,
        challenge_expires_at, verified_at, verified_expires_at, failure_reason, created_at,
        verification_hostname
      )
      VALUES (
        ${body.projectId},
        ${domain},
        ${challenge.token},
        ${method},
        'pending',
        ${challenge.tokenHash},
        ${expiresAt},
        NULL,
        NULL,
        NULL,
        now(),
        ${verificationHostname}
      )
      ON CONFLICT (project_id, domain) DO UPDATE SET
        verification_token = EXCLUDED.verification_token,
        method = EXCLUDED.method,
        status = 'pending',
        token_hash = EXCLUDED.token_hash,
        challenge_expires_at = EXCLUDED.challenge_expires_at,
        verified_at = NULL,
        verified_expires_at = NULL,
        failure_reason = NULL,
        last_checked_at = NULL,
        verification_hostname = EXCLUDED.verification_hostname
      RETURNING id, domain, method, status, challenge_expires_at, verification_hostname
    `;

    const row = rows[0];
    const claimedHostIsCname = method === "dns_txt" ? await hostIsCname(domain) : false;
    const instructions = instructionsFor({
      method,
      claimedHost: domain,
      token: challenge.token,
      verificationHostname: row.verification_hostname ? String(row.verification_hostname) : null,
      claimedHostIsCname,
    });

    // Backend is authoritative for every DNS value; the UI never derives them.
    return noStore({
      id: row.id,
      projectId: body.projectId,
      domain: normalizeHost(String(row.domain)),
      claimedHost: instructions.claimedHost,
      verificationHostname: instructions.verificationHostname,
      dnsRecordName: instructions.dnsRecordName,
      txtValue: instructions.txtValue,
      claimedHostIsCname,
      method: row.method,
      status: row.status,
      challengeExpiresAt: row.challenge_expires_at,
      instructions,
      // Token shown once for setup; also persisted while pending so status UI can re-show steps.
      token: challenge.token,
    });
  } catch (error) {
    console.error("ownership challenge failed", error);
    return noStore({ error: "Could not create ownership challenge." }, 500);
  }
}
