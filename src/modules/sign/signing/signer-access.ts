import "server-only";

import type { Prisma, SignDocument, SignSigner } from "@prisma/client";
import { generateSignerToken, hashSignerToken, safeEqualHex } from "@/platform/auth/crypto";
import { prisma, withDbRetry } from "@/platform/db";
import { logEvent } from "@/platform/logger";
import { SIGNER_TOKEN_RE } from "./constants";

/**
 * Signer link tokens and the access rules every signer request is checked against.
 * The raw token exists only in the emailed link; the DB stores HMAC-SHA256(token, TOKEN_PEPPER).
 * Never log, persist or audit the raw token.
 */

export const signerAccessSelect = {
  id: true,
  documentId: true,
  name: true,
  email: true,
  order: true,
  status: true,
  signedAt: true,
  declinedAt: true,
  otpVerifiedAt: true,
} as const satisfies Prisma.SignSignerSelect;

export const documentAccessSelect = {
  id: true,
  title: true,
  status: true,
  signingOrder: true,
  expiresAt: true,
  voidedAt: true,
  deletedAt: true,
} as const satisfies Prisma.SignDocumentSelect;

export type SignerAccessRow = Pick<SignSigner, keyof typeof signerAccessSelect>;
export type DocumentAccessRow = Pick<SignDocument, keyof typeof documentAccessSelect>;

export type SignerTokenResult =
  | { ok: true; signer: SignerAccessRow; document: DocumentAccessRow }
  | { ok: false; reason: "invalid" }
  | { ok: false; reason: "not_your_turn" };

/** Precise rejection reasons — logged server-side only, never shown to the signer. */
export type SignerDenyReason =
  | "malformed"
  | "unknown"
  | "document_status"
  | "document_deleted"
  | "document_voided"
  | "document_expired"
  | "signer_done"
  | "wrong_document";

/**
 * A new link token for the send flow. Persist only `tokenHash` (SignSigner.tokenHash) and put
 * `rawToken` in the email link — nowhere else.
 */
export function createSignerToken(): { rawToken: string; tokenHash: string } {
  const rawToken = generateSignerToken();
  return { rawToken, tokenHash: hashSignerToken(rawToken) };
}

export function isWellFormedSignerToken(token: unknown): token is string {
  return typeof token === "string" && SIGNER_TOKEN_RE.test(token);
}

/**
 * State rules shared by the link exchange and every requireSigner() call: the document is out
 * for signature (SENT / PARTIALLY_SIGNED), not deleted, voided or expired, and this signer has
 * neither signed nor declined. Returns null when access is allowed.
 */
export function evaluateSignerAccess(
  signer: SignerAccessRow,
  document: DocumentAccessRow,
  now: Date = new Date()
): SignerDenyReason | null {
  if (signer.documentId !== document.id) return "wrong_document";
  if (document.deletedAt) return "document_deleted";
  if (document.voidedAt) return "document_voided";
  if (document.status !== "SENT" && document.status !== "PARTIALLY_SIGNED") return "document_status";
  if (document.expiresAt && document.expiresAt.getTime() <= now.getTime()) return "document_expired";
  if (signer.status === "SIGNED" || signer.status === "DECLINED" || signer.signedAt || signer.declinedAt) {
    return "signer_done";
  }
  return null;
}

/** Sequential signing: true when every signer with a lower order has signed. */
async function isSignersTurn(signer: SignerAccessRow, document: DocumentAccessRow): Promise<boolean> {
  if (document.signingOrder !== "SEQUENTIAL") return true;
  const waitingOn = await withDbRetry(() =>
    prisma.signSigner.count({
      where: { documentId: document.id, order: { lt: signer.order }, status: { not: "SIGNED" } },
    })
  );
  return waitingOn === 0;
}

function deny(reason: SignerDenyReason, signerId?: string): { ok: false; reason: "invalid" } {
  logEvent("warn", "signer_link_rejected", { reason, signerId });
  return { ok: false, reason: "invalid" };
}

/**
 * Resolves an emailed link token. Malformed tokens are rejected before any DB query. Every
 * failure is the same generic `invalid` result except a sequential signer whose turn hasn't
 * come yet (`not_your_turn`), which is only reported once the link is otherwise valid.
 */
export async function resolveSignerToken(token: unknown, now: Date = new Date()): Promise<SignerTokenResult> {
  if (!isWellFormedSignerToken(token)) return deny("malformed");

  const tokenHash = hashSignerToken(token);
  const row = await withDbRetry(() =>
    prisma.signSigner.findUnique({
      where: { tokenHash },
      select: { ...signerAccessSelect, tokenHash: true, document: { select: documentAccessSelect } },
    })
  );
  if (!row) return deny("unknown");
  const { tokenHash: storedHash, document, ...signer } = row;
  // The unique lookup already matched; the constant-time compare is defence in depth.
  if (!safeEqualHex(tokenHash, storedHash)) return deny("unknown");

  const denied = evaluateSignerAccess(signer, document, now);
  if (denied) return deny(denied, signer.id);

  if (!(await isSignersTurn(signer, document))) {
    logEvent("info", "signer_link_not_your_turn", { signerId: signer.id });
    return { ok: false, reason: "not_your_turn" };
  }

  return { ok: true, signer, document };
}
