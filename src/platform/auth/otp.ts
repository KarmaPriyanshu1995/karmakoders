import "server-only";

import type { PlatformCustomer, PlatformOtpPurpose, Prisma } from "@prisma/client";
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

/** Who a challenge is for. `signerId` scopes SIGNER challenges to one signer row (null for LOGIN). */
export type OtpSubject = {
  email: string;
  purpose: PlatformOtpPurpose;
  signerId?: string | null;
};

/**
 * Issues a new OTP and emails it. Previous unconsumed codes for the same email + purpose
 * (+ signer) are invalidated in the same transaction that creates the new challenge.
 */
export async function issueOtpChallenge(
  input: OtpSubject & { ip?: string | null; actionLabel: string }
): Promise<{ ok: true }> {
  const email = parseEmail(input.email);
  const { purpose } = input;
  const signerId = input.signerId ?? null;
  const code = generateOtpCode();
  const codeHash = hashOtpCode({ email, purpose, code });
  const now = new Date();
  const expiresAt = new Date(now.getTime() + OTP_TTL_MS);

  await withDbRetry(() =>
    prisma.$transaction([
      prisma.platformOtp.updateMany({
        where: { email, purpose, signerId, consumedAt: null },
        data: { consumedAt: now },
      }),
      prisma.platformOtp.create({
        data: { email, purpose, signerId, codeHash, expiresAt, ip: input.ip ?? null },
      }),
    ])
  );

  await sendOtpEmail({ to: email, code, actionLabel: input.actionLabel });
  logEvent("info", "otp_requested", { purpose, to: maskEmail(email) });

  return { ok: true };
}

/**
 * Verifies an OTP and, on success, runs `onVerified` inside the same transaction.
 *
 * One interactive transaction:
 *  1. conditional attempt increment (unconsumed, unexpired, attempts < max)
 *  2. constant-time hash compare (wrong code commits the increment)
 *  3. conditional consume — 0 rows → abort (concurrent verify already won)
 *  4. `onVerified(tx, now)` — the caller's state change (session, signer flag, audit event)
 * Concurrent correct verifies serialize on the row lock from step 1; the loser sees
 * `consumedAt` set and fails, so `onVerified` runs exactly once per code.
 * Every failure throws the same generic 401.
 */
export async function verifyOtpChallenge<T>(
  input: OtpSubject & { code: string },
  onVerified: (tx: Prisma.TransactionClient, now: Date) => Promise<T>
): Promise<T> {
  const email = parseEmail(input.email);
  const { purpose } = input;
  const signerId = input.signerId ?? null;

  const parsedCode = otpCodeSchema.safeParse(input.code);
  if (!parsedCode.success) {
    throw verifyFailed("invalid_format", email, purpose);
  }
  const code = parsedCode.data;

  const challenge = await withDbRetry(() =>
    prisma.platformOtp.findFirst({
      where: { email, purpose, signerId, consumedAt: null },
      orderBy: { createdAt: "desc" },
      select: { id: true, codeHash: true },
    })
  );
  if (!challenge) {
    throw verifyFailed("no_active_challenge", email, purpose);
  }

  const expectedHash = hashOtpCode({ email, purpose, code });

  let outcome: { ok: false; reason: "expired_or_locked" | "wrong_code" } | { ok: true; value: T };

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

      return { ok: true as const, value: await onVerified(tx, now) };
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
  return outcome.value;
}

/** Sender sign-in code. See issueOtpChallenge. */
export async function requestCustomerOtp(input: {
  email: string;
  purpose?: PlatformOtpPurpose;
  ip?: string | null;
}): Promise<{ ok: true }> {
  const purpose: PlatformOtpPurpose = input.purpose ?? "LOGIN";
  return issueOtpChallenge({
    email: input.email,
    purpose,
    ip: input.ip,
    actionLabel: purpose === "LOGIN" ? "sign in to KarmaKoders Sign" : "verify your identity",
  });
}

/**
 * Verifies a sender code and opens a `kk_session`: customer upsert + brand-new session inside
 * the verify transaction, so concurrent correct verifies produce exactly one session.
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

  const result = await verifyOtpChallenge({ email, purpose, code: input.code }, async (tx, now) => {
    const customer = await tx.platformCustomer.upsert({
      where: { email },
      create: { email, lastLoginAt: now },
      update: { lastLoginAt: now },
      select: { id: true, email: true, name: true, status: true },
    });
    const session = await createCustomerSession(customer.id, { tx, ...input.client });
    return { customer, ...session };
  });

  await setSessionCookie(result.rawToken);
  logEvent("info", "otp_verified", { purpose, to: maskEmail(email), customerId: result.customer.id });

  return { customer: result.customer };
}
