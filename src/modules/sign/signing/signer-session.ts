import "server-only";

import { cache } from "react";
import type { Prisma } from "@prisma/client";
import { cookies } from "next/headers";
import { appendAuditEvent } from "@/platform/audit";
import { generateSessionToken, hashSignerSessionToken } from "@/platform/auth/crypto";
import { prisma, withDbRetry } from "@/platform/db";
import { PlatformError } from "@/platform/errors";
import {
  SIGNER_SESSION_TTL_MS,
  SIGNER_TOKEN_RE,
  signerCookieName,
} from "./constants";
import {
  documentAccessSelect,
  evaluateSignerAccess,
  signerAccessSelect,
  type DocumentAccessRow,
  type SignerAccessRow,
} from "./signer-access";

/**
 * Signer sessions (`kk_signer`, `__Host-kk_signer` in production): created by the link exchange,
 * fixed 2-hour lifetime, bound to one signer and one document. Only the HMAC of the cookie value
 * is stored (sign_signer_sessions.token_hash). The document state is re-checked on every call.
 */

export type SignerContext = {
  sessionId: string;
  signer: SignerAccessRow;
  document: DocumentAccessRow;
};

export const SIGNER_SESSION_EXPIRED_MESSAGE =
  "Your signing session has expired. Reopen the link from your email.";

const USER_AGENT_MAX = 512;

/** httpOnly, Secure in production, SameSite=Lax, Path=/, no Domain (required by `__Host-`). */
export function signerCookieOptions(maxAgeSec: number = Math.floor(SIGNER_SESSION_TTL_MS / 1000)) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: maxAgeSec,
  };
}

/**
 * Creates a signer session inside the caller's transaction. If the browser already holds a
 * signer cookie (`previousRawToken`), that session is revoked first, so a browser has at most
 * one live signer session. Returns the new raw cookie value (never stored or logged).
 */
export async function createSignerSession(
  tx: Prisma.TransactionClient,
  input: {
    signerId: string;
    documentId: string;
    ip?: string | null;
    userAgent?: string | null;
    previousRawToken?: string | null;
  }
): Promise<{ rawToken: string; expiresAt: Date }> {
  const now = new Date();
  if (input.previousRawToken && SIGNER_TOKEN_RE.test(input.previousRawToken)) {
    await tx.signSignerSession.updateMany({
      where: { tokenHash: hashSignerSessionToken(input.previousRawToken), revokedAt: null },
      data: { revokedAt: now },
    });
  }

  const rawToken = generateSessionToken();
  const expiresAt = new Date(now.getTime() + SIGNER_SESSION_TTL_MS);
  await tx.signSignerSession.create({
    data: {
      signerId: input.signerId,
      documentId: input.documentId,
      tokenHash: hashSignerSessionToken(rawToken),
      expiresAt,
      ip: input.ip ?? null,
      userAgent: input.userAgent ? input.userAgent.slice(0, USER_AGENT_MAX) : null,
    },
  });
  return { rawToken, expiresAt };
}

/**
 * Link exchange: one transaction that replaces the browser's previous signer session (if
 * any), creates the new one and appends the OPENED evidence event (actor SIGNER, ip, user
 * agent — never the link token).
 */
export async function startSignerSession(input: {
  signerId: string;
  documentId: string;
  ip?: string | null;
  userAgent?: string | null;
  previousRawToken?: string | null;
}): Promise<{ rawToken: string; expiresAt: Date }> {
  return prisma.$transaction(async (tx) => {
    const session = await createSignerSession(tx, input);
    await appendAuditEvent(
      {
        documentId: input.documentId,
        signerId: input.signerId,
        type: "OPENED",
        actorType: "SIGNER",
        ip: input.ip,
        userAgent: input.userAgent,
      },
      tx
    );
    return session;
  });
}

/** Validates a raw signer cookie value. Exported for tests; pages/APIs use getCurrentSigner. */
export async function loadSignerSession(
  rawToken: string | null | undefined,
  now: Date = new Date()
): Promise<SignerContext | null> {
  // Malformed or tampered values are rejected without a DB query.
  if (!rawToken || !SIGNER_TOKEN_RE.test(rawToken)) return null;

  const session = await withDbRetry(() =>
    prisma.signSignerSession.findUnique({
      where: { tokenHash: hashSignerSessionToken(rawToken) },
      select: {
        id: true,
        documentId: true,
        expiresAt: true,
        revokedAt: true,
        signer: { select: signerAccessSelect },
        document: { select: documentAccessSelect },
      },
    })
  );
  if (!session || session.revokedAt || session.expiresAt.getTime() <= now.getTime()) return null;

  const { signer, document } = session;
  if (signer.documentId !== session.documentId || document.id !== session.documentId) return null;
  // A document voided, expired or deleted after the cookie was issued is rejected here.
  if (evaluateSignerAccess(signer, document, now)) return null;

  return { sessionId: session.id, signer, document };
}

async function loadCurrentSigner(): Promise<SignerContext | null> {
  const jar = await cookies();
  return loadSignerSession(jar.get(signerCookieName())?.value);
}

/** The signer for this request, or null. Cached per request. Pages render the expired notice on null. */
export const getCurrentSigner = cache(loadCurrentSigner);

/**
 * Requires a valid signer session (API routes → 401 via toHttpError). With `documentId`, also
 * requires the session to be for that document, so a cookie for document A can't reach B.
 */
export async function requireSigner(options: { documentId?: string } = {}): Promise<SignerContext> {
  const context = await getCurrentSigner();
  if (!context || (options.documentId !== undefined && context.document.id !== options.documentId)) {
    throw new PlatformError("unauthorized", SIGNER_SESSION_EXPIRED_MESSAGE);
  }
  return context;
}
