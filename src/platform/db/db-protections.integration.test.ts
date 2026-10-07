import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  INTEGRATION_WARNING,
  assertSafeForIntegrationTests,
  integrationSkipReason,
  resetPlatformSignTables,
} from "@/platform/db/test-support/integration-db";

/**
 * Proves the DB-level protections from migration *_platform_sign_db_protections
 * (CHECK constraints and append-only triggers) against the real DATABASE_URL database.
 * Clears platform_* / sign_* tables before and after (append-only rows included, via the
 * reviewed trigger-disable path in resetPlatformSignTables).
 */

const SKIP_REASON = integrationSkipReason();
if (SKIP_REASON) {
  console.warn(`[db-protections.integration] SKIPPED: ${SKIP_REASON}`);
} else {
  assertSafeForIntegrationTests();
  console.warn(`[db-protections.integration] ${INTEGRATION_WARNING}`);
}

const RUN = `dbp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const APPEND_ONLY = /append-only/;
const CHECK_VIOLATION = /check constraint|violates check|23514/i;

describe.skipIf(Boolean(SKIP_REASON))("DB protections (DATABASE_URL)", () => {
  let prisma: Awaited<typeof import("@/platform/db")>["prisma"];
  let customerId: string;
  let documentId: string;
  let ledgerId: string;
  let auditId: string;
  let adminActionId: string;

  beforeAll(async () => {
    ({ prisma } = await import("@/platform/db"));
    await resetPlatformSignTables(prisma);
    const customer = await prisma.platformCustomer.create({ data: { email: `${RUN}@example.test` } });
    customerId = customer.id;
    const ledger = await prisma.platformCreditLedger.create({
      data: { customerId, delta: 5, balanceAfter: 5, reason: "ADMIN_GRANT", idempotencyKey: `${RUN}-grant` },
    });
    ledgerId = ledger.id;
    const document = await prisma.signDocument.create({
      data: { publicId: `KKS-2026-${RUN.slice(-6).toUpperCase()}`, ownerId: customerId, source: "UPLOAD", title: RUN },
    });
    documentId = document.id;
    const audit = await prisma.signAuditEvent.create({
      data: { documentId, type: "CREATED", actorType: "SENDER", sequence: 1, hash: "h1" },
    });
    auditId = audit.id;
    const action = await prisma.platformAdminAction.create({
      data: { staffUserId: "staff-test", action: "note", targetType: "customer", targetId: customerId },
    });
    adminActionId = action.id;
  });

  afterAll(async () => {
    if (prisma) await resetPlatformSignTables(prisma);
  });

  it("reset re-enables the TRUNCATE guards (append-only still enforced afterwards)", async () => {
    const guards = await prisma.$queryRawUnsafe<{ tgenabled: string }[]>(
      `SELECT t.tgenabled::text AS tgenabled FROM pg_trigger t WHERE t.tgname LIKE '%\_no\_truncate'`
    );
    expect(guards.length).toBe(3);
    expect(guards.every((g) => g.tgenabled === "O")).toBe(true);
  });

  it("reset never touches CMS tables or sign_early_access", async () => {
    const { filterResettableTables } = await import("@/platform/db/test-support/integration-db");
    const rows = await prisma.$queryRawUnsafe<{ tablename: string }[]>(
      `SELECT tablename FROM pg_tables WHERE schemaname = current_schema()`
    );
    const resettable = filterResettableTables(rows.map((r) => r.tablename));
    expect(resettable.length).toBeGreaterThanOrEqual(16);
    expect(resettable.every((t) => /^(platform|sign)_/.test(t))).toBe(true);
    expect(resettable).not.toContain("sign_early_access");
  });

  const appendOnly = [
    { table: "sign_audit_events", id: () => auditId },
    { table: "platform_credit_ledger", id: () => ledgerId },
    { table: "platform_admin_actions", id: () => adminActionId },
  ];

  for (const { table, id } of appendOnly) {
    it(`${table}: UPDATE is rejected`, async () => {
      await expect(
        prisma.$executeRawUnsafe(`UPDATE "${table}" SET "created_at" = now() WHERE "id" = $1::uuid`, id())
      ).rejects.toThrow(APPEND_ONLY);
    });

    it(`${table}: DELETE is rejected`, async () => {
      await expect(
        prisma.$executeRawUnsafe(`DELETE FROM "${table}" WHERE "id" = $1::uuid`, id())
      ).rejects.toThrow(APPEND_ONLY);
    });

    it(`${table}: TRUNCATE is rejected (inside a rolled-back transaction)`, async () => {
      await expect(
        prisma.$transaction(async (tx) => {
          await tx.$executeRawUnsafe(`TRUNCATE "${table}" CASCADE`);
          throw new Error("ROLLBACK_SENTINEL: truncate was NOT blocked");
        })
      ).rejects.toThrow(APPEND_ONLY);
    });
  }

  it("platform_customers.credits_balance cannot go negative", async () => {
    await expect(
      prisma.platformCustomer.update({ where: { id: customerId }, data: { creditsBalance: -1 } })
    ).rejects.toThrow(CHECK_VIOLATION);
  });

  it("platform_credit_ledger rejects delta = 0 and negative balance_after", async () => {
    await expect(
      prisma.platformCreditLedger.create({
        data: { customerId, delta: 0, balanceAfter: 5, reason: "USAGE", idempotencyKey: `${RUN}-zero` },
      })
    ).rejects.toThrow(CHECK_VIOLATION);
    await expect(
      prisma.platformCreditLedger.create({
        data: { customerId, delta: -10, balanceAfter: -5, reason: "USAGE", idempotencyKey: `${RUN}-neg` },
      })
    ).rejects.toThrow(CHECK_VIOLATION);
  });

  it("platform_usage.free_used cannot go negative", async () => {
    await expect(
      prisma.platformUsage.create({ data: { customerId, tool: "SIGN", period: "2026-10", freeUsed: -1 } })
    ).rejects.toThrow(CHECK_VIOLATION);
  });

  it("platform_payments.amount_total_cents cannot be negative", async () => {
    await expect(
      prisma.platformPayment.create({
        data: {
          paddleTransactionId: `${RUN}-txn`,
          status: "COMPLETED",
          amountTotalCents: -100,
          currency: "USD",
          occurredAt: new Date(),
        },
      })
    ).rejects.toThrow(CHECK_VIOLATION);
  });

  it("sign_fields coordinates must be 0–1 fractions", async () => {
    const base = { documentId, type: "SIGNATURE" as const, page: 1, x: 0.1, y: 0.1, width: 0.2, height: 0.05 };
    for (const bad of [{ x: 1.5 }, { y: -0.1 }, { width: 2 }, { height: -1 }]) {
      await expect(prisma.signField.create({ data: { ...base, ...bad } })).rejects.toThrow(CHECK_VIOLATION);
    }
    await expect(prisma.signField.create({ data: { ...base, x: 1, y: 0 } })).resolves.toBeDefined();
  });
});
