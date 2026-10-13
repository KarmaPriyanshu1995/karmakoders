import "server-only";

import { issueOtpChallenge, verifyOtpChallenge } from "@/platform/auth/otp";
import { appendAuditEvent } from "@/platform/audit";
import { logEvent } from "@/platform/logger";
import type { SignerContext } from "./signer-session";

/**
 * Signer email OTP (purpose SIGNER) on top of the hardened platform OTP core. The address is
 * always the signer row's email — the signer can't choose or change it. Challenges are scoped
 * to the signer id, so the same person signing two documents has independent codes.
 */

type Client = { ip?: string | null; userAgent?: string | null };

export async function requestSignerOtp(context: SignerContext, client: Client = {}): Promise<{ ok: true }> {
  const { signer, document } = context;
  await issueOtpChallenge({
    email: signer.email,
    purpose: "SIGNER",
    signerId: signer.id,
    ip: client.ip,
    actionLabel: "verify your identity before signing",
  });
  await appendAuditEvent({
    documentId: document.id,
    signerId: signer.id,
    type: "OTP_SENT",
    actorType: "SIGNER",
    ip: client.ip,
    userAgent: client.userAgent,
  });
  return { ok: true };
}

/**
 * Verifies the signer's code. In the OTP transaction: set `otpVerifiedAt` only if still null
 * and, only when that write happened, append OTP_VERIFIED — so concurrent correct verifies
 * (or a repeat after success) record exactly one event. Wrong codes throw the generic 401.
 */
export async function verifySignerOtp(
  context: SignerContext,
  code: string,
  client: Client = {}
): Promise<{ verified: true; firstVerification: boolean }> {
  const { signer, document } = context;
  const firstVerification = await verifyOtpChallenge(
    { email: signer.email, purpose: "SIGNER", signerId: signer.id, code },
    async (tx, now) => {
      const { count } = await tx.signSigner.updateMany({
        where: { id: signer.id, documentId: document.id, otpVerifiedAt: null },
        data: { otpVerifiedAt: now },
      });
      if (count === 0) return false;
      await appendAuditEvent(
        {
          documentId: document.id,
          signerId: signer.id,
          type: "OTP_VERIFIED",
          actorType: "SIGNER",
          ip: client.ip,
          userAgent: client.userAgent,
        },
        tx
      );
      return true;
    }
  );
  logEvent("info", "signer_otp_verified", { signerId: signer.id, firstVerification });
  return { verified: true, firstVerification };
}
