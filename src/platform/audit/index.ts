import "server-only";

import { createHash } from "crypto";
import type { Prisma, SignActorType, SignAuditEventType } from "@prisma/client";
import { prisma, withDbRetry } from "@/platform/db";

/**
 * Append-only, hash-chained Sign evidence (`sign_audit_events`, ADR 010).
 *
 * Each event gets the next gap-free `sequence` for its document, `prevHash` = the previous
 * event's hash, and `hash` = SHA-256 over its canonical fields + prevHash. Writers serialise per
 * document by locking the document row (`FOR UPDATE`) inside the transaction; the unique
 * (document_id, sequence) constraint is the backstop. Postgres triggers block UPDATE/DELETE.
 */

export type AuditMetadataValue = string | number | boolean | null;
export type AuditMetadata = Readonly<Record<string, AuditMetadataValue>>;

export type AppendAuditEventInput = {
  documentId: string;
  signerId?: string | null;
  type: SignAuditEventType;
  actorType: SignActorType;
  ip?: string | null;
  userAgent?: string | null;
  metadata?: AuditMetadata;
};

/** Fields covered by the hash, in canonical form. */
export type AuditHashInput = {
  documentId: string;
  signerId: string | null;
  type: string;
  actorType: string;
  ip: string | null;
  userAgent: string | null;
  metadata: AuditMetadata | null;
  occurredAt: Date;
  sequence: number;
  prevHash: string | null;
};

/** Same sensitive-name rule as the logger: tokens, codes and secrets never go into evidence. */
const SENSITIVE_METADATA_KEY = /code|token|otp|secret|password|pepper|html|body|key/i;

const USER_AGENT_MAX = 512;

export class AuditMetadataError extends Error {
  constructor(key: string) {
    super(`Audit metadata key "${key}" is not allowed (sensitive name)`);
    this.name = "AuditMetadataError";
  }
}

function assertSafeMetadata(metadata: AuditMetadata | undefined): void {
  if (!metadata) return;
  for (const key of Object.keys(metadata)) {
    if (SENSITIVE_METADATA_KEY.test(key)) throw new AuditMetadataError(key);
  }
}

/** JSON with object keys sorted recursively, so the hash never depends on key order. */
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonicalJson(v)}`).join(",")}}`;
}

/** SHA-256 hex over the canonical event fields + prevHash. */
export function computeAuditHash(input: AuditHashInput): string {
  const payload = canonicalJson({
    actorType: input.actorType,
    documentId: input.documentId,
    ip: input.ip,
    metadata: input.metadata,
    occurredAt: input.occurredAt.toISOString(),
    prevHash: input.prevHash,
    sequence: input.sequence,
    signerId: input.signerId,
    type: input.type,
    userAgent: input.userAgent,
  });
  return createHash("sha256").update(payload).digest("hex");
}

type StoredAuditEvent = Omit<AuditHashInput, "metadata"> & { metadata: unknown; hash: string };

/**
 * True when `events` (one document, any order) form an intact chain: sequences 1..n with no
 * gaps, each prevHash equal to the previous hash, and every hash recomputes.
 */
export function verifyAuditChain(events: readonly StoredAuditEvent[]): boolean {
  const sorted = [...events].sort((a, b) => a.sequence - b.sequence);
  let prevHash: string | null = null;
  for (let i = 0; i < sorted.length; i++) {
    const event = sorted[i];
    if (event.sequence !== i + 1 || event.prevHash !== prevHash) return false;
    if (i > 0 && event.documentId !== sorted[0].documentId) return false;
    const expected = computeAuditHash({ ...event, metadata: (event.metadata ?? null) as AuditMetadata | null });
    if (expected !== event.hash) return false;
    prevHash = event.hash;
  }
  return true;
}

async function appendInTx(tx: Prisma.TransactionClient, input: AppendAuditEventInput) {
  assertSafeMetadata(input.metadata);

  // Serialise writers for this document (row lock held until the transaction ends).
  const locked = await tx.$queryRaw<{ id: string }[]>`
    SELECT id FROM sign_documents WHERE id = ${input.documentId}::uuid FOR UPDATE`;
  if (locked.length === 0) throw new Error("[platform/audit] Document not found for audit event");

  const last = await tx.signAuditEvent.findFirst({
    where: { documentId: input.documentId },
    orderBy: { sequence: "desc" },
    select: { sequence: true, hash: true },
  });

  const fields: AuditHashInput = {
    documentId: input.documentId,
    signerId: input.signerId ?? null,
    type: input.type,
    actorType: input.actorType,
    ip: input.ip ?? null,
    userAgent: input.userAgent ? input.userAgent.slice(0, USER_AGENT_MAX) : null,
    metadata: input.metadata ?? null,
    occurredAt: new Date(),
    sequence: (last?.sequence ?? 0) + 1,
    prevHash: last?.hash ?? null,
  };

  return tx.signAuditEvent.create({
    data: {
      documentId: fields.documentId,
      signerId: fields.signerId,
      type: input.type,
      actorType: input.actorType,
      ip: fields.ip,
      userAgent: fields.userAgent,
      metadata: fields.metadata ?? undefined,
      occurredAt: fields.occurredAt,
      sequence: fields.sequence,
      prevHash: fields.prevHash,
      hash: computeAuditHash(fields),
    },
    select: { id: true, sequence: true, hash: true },
  });
}

/**
 * Appends one evidence event. Pass `tx` to make it part of the caller's transaction (so the
 * event commits or rolls back with the state change it records); otherwise it runs in its own.
 * Metadata keys with sensitive names (token, code, otp, secret, …) throw.
 */
export async function appendAuditEvent(
  input: AppendAuditEventInput,
  tx?: Prisma.TransactionClient
): Promise<{ id: string; sequence: number; hash: string }> {
  if (tx) return appendInTx(tx, input);
  assertSafeMetadata(input.metadata);
  return withDbRetry(() => prisma.$transaction((inner) => appendInTx(inner, input)));
}
