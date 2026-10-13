import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  INTEGRATION_WARNING,
  assertSafeForIntegrationTests,
  integrationSkipReason,
  resetPlatformSignTables,
} from "@/platform/db/test-support/integration-db";

/** appendAuditEvent against DATABASE_URL: gap-free sequences and a valid hash chain. */

const SKIP_REASON = integrationSkipReason();
if (SKIP_REASON) {
  console.warn(`[audit.integration] SKIPPED: ${SKIP_REASON}`);
} else {
  assertSafeForIntegrationTests();
  console.warn(`[audit.integration] ${INTEGRATION_WARNING}`);
}

const RUN = `audit-it-${Date.now()}`;

describe.skipIf(Boolean(SKIP_REASON))("appendAuditEvent (DATABASE_URL)", () => {
  let prisma: Awaited<typeof import("@/platform/db")>["prisma"];
  let audit: typeof import("@/platform/audit");
  let documentId: string;

  beforeAll(async () => {
    ({ prisma } = await import("@/platform/db"));
    audit = await import("@/platform/audit");
    const { generatePublicId } = await import("@/modules/sign/documents/public-id");
    await resetPlatformSignTables(prisma);
    const owner = await prisma.platformCustomer.create({ data: { email: `${RUN}@example.test` } });
    documentId = (
      await prisma.signDocument.create({
        data: { publicId: generatePublicId(), ownerId: owner.id, source: "UPLOAD", title: RUN, status: "SENT" },
      })
    ).id;
  }, 60_000);

  afterAll(async () => {
    if (prisma) await resetPlatformSignTables(prisma);
  });

  it("appends in sequence with a valid hash chain, including concurrent writers", async () => {
    await audit.appendAuditEvent({ documentId, type: "CREATED", actorType: "SENDER", metadata: { source: "upload" } });
    await audit.appendAuditEvent({ documentId, type: "SENT", actorType: "SENDER" });
    await Promise.all(
      Array.from({ length: 5 }, (_, i) =>
        audit.appendAuditEvent({ documentId, type: "REMINDED", actorType: "SYSTEM", metadata: { n: i } })
      )
    );

    const events = await prisma.signAuditEvent.findMany({ where: { documentId }, orderBy: { sequence: "asc" } });
    expect(events.map((e) => e.sequence)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(events[0].prevHash).toBeNull();
    for (let i = 1; i < events.length; i++) expect(events[i].prevHash).toBe(events[i - 1].hash);
    expect(audit.verifyAuditChain(events)).toBe(true);

    // Any edit to stored evidence breaks verification (the DB also blocks the edit itself).
    expect(audit.verifyAuditChain(events.map((e, i) => (i === 3 ? { ...e, type: "VOIDED" as const } : e)))).toBe(false);
  });

  it("rolls back with the caller's transaction", async () => {
    const before = await prisma.signAuditEvent.count({ where: { documentId } });
    await expect(
      prisma.$transaction(async (tx) => {
        await audit.appendAuditEvent({ documentId, type: "VIEWED", actorType: "SIGNER" }, tx);
        throw new Error("abort");
      })
    ).rejects.toThrow("abort");
    expect(await prisma.signAuditEvent.count({ where: { documentId } })).toBe(before);
  });
});
