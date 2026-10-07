import "server-only";

import type { PlatformCustomer, PlatformOtpPurpose } from "@prisma/client";
import { prisma, withDbRetry } from "@/platform/db";
import { PlatformError } from "@/platform/errors";
import { sendOtpEmail } from "@/platform/email";
import { logEvent, maskEmail } from "@/platform/logger";
import { OTP_MAX_ATTEMPTS, OTP_TTL_MS } from "./constants";
import { generateOtpCode, hashOtpCode, safeEqualHex } from "./crypto";
import { emailSchema, otpCodeSchema } from "./schemas";
import { createCustomerSession, setSessionCookie } from "./session";

/** Single message for every verify failure — never reveals which check failed. */
export const OTP_INVALID_MESSAGE = "Invalid or expired code. Request a new one.";

const VERIFY_TX_OPTIONS = { maxWait: 10_000, timeout: 15_000 } as const;

type VerifiedCustomer = Pick<PlatformCustomer, "id" | "email" | "name" | "status">;

type VerifyFailureReason =
  | "invalid_format"
  | "no_active_challenge"
  | "expired_or_locked"
  | "wrong_code"
  | "consume_conflict";

class ConsumeConflictError extends Error {
  constructor() {
    super("OTP challenge was consumed concurrently");
    this.name = "ConsumeConflictError";
  }
}

function parseEmail(raw: string): string {
  const parsed = emailSchema.safeParse(raw);
  if (!parsed.success) {
    throw new PlatformError("bad_request", "Enter a valid email address");
  }
  return parsed.data;
}

function verifyFailed(
  reason: VerifyFailureReason,
  email: string,
  purpose: PlatformOtpPurpose,
  challengeId?: string
): PlatformError {
  logEvent("warn", "otp_verify_failed", {
    reason,
    purpose,
    to: maskEmail(email),
    challengeId,
  });
  return new PlatformError("unauthorized", OTP_INVALID_MESSAGE);
}

/**
 * Issues a new OTP. Previous unconsumed codes for the same email + purpose are
 * invalidated in the same transaction that creates the new challenge.
 */
export async function requestCustomerOtp(input: {
  email: string;
  purpose?: PlatformOtpPurpose;
  ip?: string | null;
}): Promise<{ ok: true }> {
  const email = parseEmail(input.email);
  const purpose: PlatformOtpPurpose = input.purpose ?? "LOGIN";
  const code = generateOtpCode();
  const codeHash = hashOtpCode({ email, purpose, code });
  const now = new Date();
  const expiresAt = new Date(now.getTime() + OTP_TTL_MS);

  await withDbRetry(() =>
    prisma.$transaction([
      prisma.platformOtp.updateMany({
        where: { email, purpose, consumedAt: null },
        data: { consumedAt: now },
      }),
      prisma.platformOtp.create({
        data: { email, purpose, codeHash, expiresAt, ip: input.ip ?? null },
      }),
    ])
  );

  await sendOtpEmail({
    to: email,
    code,
    actionLabel: purpose === "LOGIN" ? "sign in to KarmaKoders Sign" : "verify your identity",
  });
  logEvent("info", "otp_requested", { purpose, to: maskEmail(email) });

  return { ok: true };
}

/**
 * Verifies an OTP and opens a `kk_session`.
 *
 * One interactive transaction:
 *  1. conditional attempt increment (unconsumed, unexpired, attempts < max)
 *  2. constant-time hash compare (wrong code commits the increment)
 *  3. conditional consume — 0 rows → abort (concurrent verify already won)
 *  4. customer upsert (credits live on the customer row) + session create
 * Concurrent correct verifies serialize on the row lock from step 1; the loser sees
 * `consumedAt` set and fails, so exactly one session is created.
 */
export async function verifyCustomerOtp(input: {
  email: string;
  code: string;
  purpose?: PlatformOtpPurpose;
  /** Recorded on the new session row. */
  client?: { ip?: string | null; userAgent?: string | null };
}): Promise<{ customer: VerifiedCustomer }> {
  const email = parseEmail(input.email);
  const purpose: PlatformOtpPurpose = input.purpose ?? "LOGIN";

  const parsedCode = otpCodeSchema.safeParse(input.code);
  if (!parsedCode.success) {
    throw verifyFailed("invalid_format", email, purpose);
  }
  const code = parsedCode.data;

  const challenge = await withDbRetry(() =>
    prisma.platformOtp.findFirst({
      where: { email, purpose, consumedAt: null },
      orderBy: { createdAt: "desc" },
      select: { id: true, codeHash: true },
    })
  );
  if (!challenge) {
    throw verifyFailed("no_active_challenge", email, purpose);
  }

  const expectedHash = hashOtpCode({ email, purpose, code });

  let outcome:
    | { ok: false; reason: "expired_or_locked" | "wrong_code" }
    | { ok: true; customer: VerifiedCustomer; rawToken: string; expiresAt: Date };

  try {
    outcome = await prisma.$transaction(async (tx) => {
      const now = new Date();

      const counted = await tx.platformOtp.updateMany({
        where: {
          id: challenge.id,
          attempts: { lt: OTP_MAX_ATTEMPTS },
          consumedAt: null,
          expiresAt: { gt: now },
        },
        data: { attempts: { increment: 1 } },
      });
      if (counted.count === 0) {
        return { ok: false as const, reason: "expired_or_locked" as const };
      }

      if (!safeEqualHex(expectedHash, challenge.codeHash)) {
        // Return (not throw) so the attempt increment commits.
        return { ok: false as const, reason: "wrong_code" as const };
      }

      const consumed = await tx.platformOtp.updateMany({
        where: { id: challenge.id, consumedAt: null },
        data: { consumedAt: now },
      });
      if (consumed.count === 0) {
        throw new ConsumeConflictError();
      }

      const customer = await tx.platformCustomer.upsert({
        where: { email },
        create: { email, lastLoginAt: now },
        update: { lastLoginAt: now },
        select: { id: true, email: true, name: true, status: true },
      });

      const session = await createCustomerSession(customer.id, { tx, ...input.client });
      return { ok: true as const, customer, ...session };
    }, VERIFY_TX_OPTIONS);
  } catch (error) {
    if (error instanceof ConsumeConflictError) {
      throw verifyFailed("consume_conflict", email, purpose, challenge.id);
    }
    throw error;
  }

  if (!outcome.ok) {
    throw verifyFailed(outcome.reason, email, purpose, challenge.id);
  }

  await setSessionCookie(outcome.rawToken, outcome.expiresAt);
  logEvent("info", "otp_verified", { purpose, to: maskEmail(email), customerId: outcome.customer.id });

  return { customer: outcome.customer };
}
