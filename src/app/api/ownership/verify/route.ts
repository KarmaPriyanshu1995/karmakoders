import { NextResponse } from "next/server";
import { getSql } from "@/lib/scanner/db";
import {
  VERIFIED_TTL_MS,
  hostFromUrl,
  instructionsFor,
  normalizeHost,
  verifyDnsTxt,
  verifyHttpFile,
} from "@/lib/scanner/ownership";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Body = { projectId?: string };

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function noStore(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0" },
  });
}

async function handleVerify(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return noStore({ error: "Expected JSON body with projectId." }, 400);
  }
  if (!body.projectId || !UUID_RE.test(body.projectId)) {
    return noStore({ error: "Valid projectId is required." }, 400);
  }

  try {
    const sql = getSql();
    const projects = await sql`
      SELECT id, primary_url FROM projects WHERE id = ${body.projectId} LIMIT 1
    `;
    const project = projects[0];
    if (!project) return noStore({ error: "Project not found." }, 404);

    let host: string;
    try {
      host = hostFromUrl(String(project.primary_url));
    } catch {
      return noStore({ error: "Invalid project URL." }, 400);
    }

    // Binding: this project + this exact claimed host. www and apex are distinct claims.
    const rows = await sql`
      SELECT id, domain, method, status, verification_token, challenge_expires_at,
             verification_hostname
      FROM verified_domains
      WHERE project_id = ${body.projectId}
        AND lower(domain) = ${host}
      LIMIT 1
    `;
    const row = rows[0];
    if (!row) {
      return noStore(
        {
          error: "No ownership challenge found. Create one first.",
          status: "failed",
          failureReason: "challenge_not_found",
          claimedHost: host,
        },
        404
      );
    }

    if (
      row.challenge_expires_at &&
      new Date(String(row.challenge_expires_at)).getTime() < Date.now() &&
      row.status !== "verified"
    ) {
      await sql`
        UPDATE verified_domains
        SET status = 'expired', failure_reason = 'challenge_expired', last_checked_at = now()
        WHERE id = ${row.id} AND project_id = ${body.projectId}
      `;
      return noStore({
        status: "expired",
        failureReason: "challenge_expired",
        domain: normalizeHost(String(row.domain)),
        claimedHost: host,
        message: "Your verification challenge expired. Generate a new challenge.",
      });
    }

    const token = String(row.verification_token || "");
    const method = String(row.method || "http_file");
    let verificationHostname: string | null = null;
    let failureMessage: string | null = null;
    let hint: string | null = null;
    let result: { ok: boolean; reason?: string };
    if (method === "dns_txt") {
      const dnsResult = await verifyDnsTxt({
        claimedHost: host,
        token,
        storedVerificationHostname: row.verification_hostname ? String(row.verification_hostname) : null,
      });
      verificationHostname = dnsResult.verificationHostname;
      failureMessage = dnsResult.message ?? null;
      hint = dnsResult.hint ?? null;
      result = dnsResult;
    } else {
      result = await verifyHttpFile(String(project.primary_url), token);
    }

    if (result.ok) {
      const verifiedExpires = new Date(Date.now() + VERIFIED_TTL_MS).toISOString();
      await sql`
        UPDATE verified_domains
        SET status = 'verified',
            verified_at = now(),
            verified_expires_at = ${verifiedExpires},
            last_checked_at = now(),
            failure_reason = NULL
        WHERE id = ${row.id} AND project_id = ${body.projectId}
      `;
      return noStore({
        status: "verified",
        domain: normalizeHost(String(row.domain)),
        claimedHost: host,
        verificationHostname,
        method,
        verifiedExpiresAt: verifiedExpires,
        message:
          "Ownership verified. Start a new scan to run ownership-gated active checks.",
      });
    }

    const reason = result.reason || "verify_failed";
    await sql`
      UPDATE verified_domains
      SET status = 'failed',
          last_checked_at = now(),
          failure_reason = ${reason.slice(0, 300)}
      WHERE id = ${row.id} AND project_id = ${body.projectId}
    `;
    return noStore({
      status: "failed",
      domain: normalizeHost(String(row.domain)),
      claimedHost: host,
      // The exact name we queried (same value the challenge API returned).
      checkedHostname: verificationHostname,
      verificationHostname,
      method,
      failureReason: reason,
      message: failureMessage ?? "Ownership could not be verified yet. Check the instructions and try again.",
      hint,
      // Re-show the exact record to add (same values as the challenge response).
      instructions:
        method === "dns_txt"
          ? instructionsFor({
              method: "dns_txt",
              claimedHost: host,
              token,
              verificationHostname,
            })
          : null,
    });
  } catch (error) {
    console.error("ownership verify failed", error);
    const msg = error instanceof Error ? error.message : "verify_error";
    if (msg.startsWith("host_")) {
      return noStore({ status: "failed", failureReason: msg }, 400);
    }
    return noStore({ error: "Could not verify ownership." }, 500);
  }
}

export async function POST(request: Request) {
  return handleVerify(request);
}
