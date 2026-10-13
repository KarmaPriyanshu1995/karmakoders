import "server-only";

import type { SignDocument, SignDocumentStatus } from "@prisma/client";
import { z } from "zod";
import { prisma, SIGN_DOCUMENT_STATUSES, withDbRetry } from "@/platform/db";
import { NotFoundError, PlatformError } from "@/platform/errors";

/**
 * Owner-scoped document access. Every Sign API route, page and Server Action that reads or
 * changes a document goes through this module (enforced by access-boundary.test.ts) — never
 * `prisma.signDocument` directly. A document that doesn't exist, belongs to someone else or is
 * soft-deleted is indistinguishable: NotFoundError → 404, never 403.
 */

const documentIdSchema = z.uuid();

export async function getDocumentForOwner(customerId: string, documentId: string): Promise<SignDocument> {
  if (!documentIdSchema.safeParse(documentId).success) throw new NotFoundError();
  const document = await withDbRetry(() =>
    prisma.signDocument.findFirst({ where: { id: documentId, ownerId: customerId, deletedAt: null } })
  );
  if (!document) throw new NotFoundError();
  return document;
}

export const DOCUMENT_LIST_DEFAULT_LIMIT = 20;
export const DOCUMENT_LIST_MAX_LIMIT = 100;

const listOptionsSchema = z.object({
  status: z.enum(SIGN_DOCUMENT_STATUSES).optional(),
  cursor: z.uuid().optional(),
  limit: z.number().int().min(1).max(DOCUMENT_LIST_MAX_LIMIT).default(DOCUMENT_LIST_DEFAULT_LIMIT),
});

export type ListDocumentsOptions = {
  status?: SignDocumentStatus;
  /** `nextCursor` from the previous page. */
  cursor?: string;
  limit?: number;
};

/** Dashboard row: no frozen HTML, field values or hashes. */
const documentSummarySelect = {
  id: true,
  publicId: true,
  title: true,
  status: true,
  source: true,
  signingOrder: true,
  sentAt: true,
  completedAt: true,
  expiresAt: true,
  createdAt: true,
  updatedAt: true,
} as const;

export type DocumentSummary = Pick<SignDocument, keyof typeof documentSummarySelect>;

/**
 * The owner's non-deleted documents, newest first, with keyset pagination on `id`
 * (UUID v7 is time-ordered, so `id DESC` is creation order and stable across pages).
 */
export async function listDocumentsForOwner(
  customerId: string,
  options: ListDocumentsOptions = {}
): Promise<{ items: DocumentSummary[]; nextCursor: string | null }> {
  const parsed = listOptionsSchema.safeParse(options);
  if (!parsed.success) throw new PlatformError("bad_request", "Invalid document list request");
  const { status, cursor, limit } = parsed.data;

  const rows = await withDbRetry(() =>
    prisma.signDocument.findMany({
      where: {
        ownerId: customerId,
        deletedAt: null,
        ...(status ? { status } : {}),
        ...(cursor ? { id: { lt: cursor } } : {}),
      },
      orderBy: { id: "desc" },
      take: limit + 1,
      select: documentSummarySelect,
    })
  );

  const items = rows.slice(0, limit);
  const nextCursor = rows.length > limit ? items[items.length - 1].id : null;
  return { items, nextCursor };
}
