import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  INTEGRATION_WARNING,
  assertSafeForIntegrationTests,
  integrationSkipReason,
  resetPlatformSignTables,
} from "@/platform/db/test-support/integration-db";

/** Owner-scoped document access against DATABASE_URL (Neon dev branch / CI postgres). */

const SKIP_REASON = integrationSkipReason();
if (SKIP_REASON) {
  console.warn(`[documents-access.integration] SKIPPED: ${SKIP_REASON}`);
} else {
  assertSafeForIntegrationTests();
  console.warn(`[documents-access.integration] ${INTEGRATION_WARNING}`);
}

const RUN = `doc-acc-${Date.now()}`;

describe.skipIf(Boolean(SKIP_REASON))("document access (DATABASE_URL)", () => {
  let prisma: Awaited<typeof import("@/platform/db")>["prisma"];
  let access: typeof import("./access");
  let NotFoundError: typeof import("@/platform/errors").NotFoundError;
  let ownerId: string;
  let otherId: string;
  const ownerDocs: string[] = [];
  let deletedId: string;
  let otherDocId: string;

  beforeAll(async () => {
    ({ prisma } = await import("@/platform/db"));
    access = await import("./access");
    ({ NotFoundError } = await import("@/platform/errors"));
    const { generatePublicId } = await import("./public-id");
    await resetPlatformSignTables(prisma);

    ownerId = (await prisma.platformCustomer.create({ data: { email: `${RUN}-owner@example.test` } })).id;
    otherId = (await prisma.platformCustomer.create({ data: { email: `${RUN}-other@example.test` } })).id;
    const create = (owner: string, title: string, status: "DRAFT" | "SENT" = "DRAFT", deletedAt: Date | null = null) =>
      prisma.signDocument.create({
        data: { publicId: generatePublicId(), ownerId: owner, source: "UPLOAD", title, status, deletedAt },
      });

    for (let i = 0; i < 5; i++) ownerDocs.push((await create(ownerId, `owner ${i}`, i % 2 ? "SENT" : "DRAFT")).id);
    deletedId = (await create(ownerId, "deleted", "SENT", new Date())).id;
    otherDocId = (await create(otherId, "someone else's")).id;
  }, 60_000);

  afterAll(async () => {
    if (prisma) await resetPlatformSignTables(prisma);
  });

  it("the owner can read their document", async () => {
    const doc = await access.getDocumentForOwner(ownerId, ownerDocs[0]);
    expect(doc.id).toBe(ownerDocs[0]);
    expect(doc.ownerId).toBe(ownerId);
  });

  it("another customer gets NotFoundError (404, never 403)", async () => {
    const attempt = access.getDocumentForOwner(otherId, ownerDocs[0]);
    await expect(attempt).rejects.toBeInstanceOf(NotFoundError);
    await expect(access.getDocumentForOwner(otherId, ownerDocs[0])).rejects.toMatchObject({ status: 404 });
    await expect(access.getDocumentForOwner(ownerId, otherDocId)).rejects.toBeInstanceOf(NotFoundError);
  });

  it("a deleted document is not found, even for its owner", async () => {
    await expect(access.getDocumentForOwner(ownerId, deletedId)).rejects.toBeInstanceOf(NotFoundError);
  });

  it("unknown or malformed ids are not found", async () => {
    await expect(access.getDocumentForOwner(ownerId, "0192f0c4-0000-7000-8000-000000000000")).rejects.toBeInstanceOf(NotFoundError);
    await expect(access.getDocumentForOwner(ownerId, "not-a-uuid")).rejects.toBeInstanceOf(NotFoundError);
  });

  it("listing returns only the owner's non-deleted documents, newest first", async () => {
    const { items, nextCursor } = await access.listDocumentsForOwner(ownerId);
    expect(items.map((d) => d.id)).toEqual([...ownerDocs].reverse());
    expect(nextCursor).toBeNull();
    expect(items.map((d) => d.id)).not.toContain(deletedId);
    expect(items.map((d) => d.id)).not.toContain(otherDocId);
    expect(items[0]).not.toHaveProperty("renderedHtml");

    const other = await access.listDocumentsForOwner(otherId);
    expect(other.items.map((d) => d.id)).toEqual([otherDocId]);
  });

  it("filters by status", async () => {
    const { items } = await access.listDocumentsForOwner(ownerId, { status: "SENT" });
    expect(items.map((d) => d.id).sort()).toEqual([ownerDocs[1], ownerDocs[3]].sort());
  });

  it("paginates with a cursor: no overlap, no gaps", async () => {
    const page1 = await access.listDocumentsForOwner(ownerId, { limit: 2 });
    expect(page1.items).toHaveLength(2);
    const page2 = await access.listDocumentsForOwner(ownerId, { limit: 2, cursor: page1.nextCursor! });
    const page3 = await access.listDocumentsForOwner(ownerId, { limit: 2, cursor: page2.nextCursor! });
    expect(page3.nextCursor).toBeNull();
    const all = [...page1.items, ...page2.items, ...page3.items].map((d) => d.id);
    expect(all).toEqual([...ownerDocs].reverse());
  });

  it("rejects invalid list options", async () => {
    await expect(access.listDocumentsForOwner(ownerId, { limit: 0 })).rejects.toMatchObject({ status: 400 });
    await expect(access.listDocumentsForOwner(ownerId, { limit: 101 })).rejects.toMatchObject({ status: 400 });
    await expect(access.listDocumentsForOwner(ownerId, { cursor: "nope" })).rejects.toMatchObject({ status: 400 });
  });
});
