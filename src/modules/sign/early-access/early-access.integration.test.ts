import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import {
  INTEGRATION_WARNING,
  assertSafeForIntegrationTests,
  integrationSkipReason,
} from "@/platform/db/test-support/integration-db";

/**
 * Early-access signups against the real DATABASE_URL database.
 * sign_early_access is PRESERVED by the integration reset (it may hold real signups), so this
 * suite never truncates it: it only creates and deletes rows under its own unique email prefix.
 */

const SKIP_REASON = integrationSkipReason();
if (SKIP_REASON) {
  console.warn(`[early-access.integration] SKIPPED: ${SKIP_REASON}`);
} else {
  assertSafeForIntegrationTests();
  console.warn(`[early-access.integration] ${INTEGRATION_WARNING} (sign_early_access: own test rows only)`);
}

const RUN = `ea-it-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const email = (n: number) => `${RUN}-${n}@example.test`;

describe.skipIf(Boolean(SKIP_REASON))("early access (DATABASE_URL)", () => {
  beforeEach(() => {
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
  });

  afterAll(async () => {
    const { prisma } = await import("@/platform/db");
    await prisma.signEarlyAccess.deleteMany({ where: { email: { startsWith: RUN } } });
  });

  it("stores a valid signup (normalised email, optional fields)", async () => {
    const { prisma } = await import("@/platform/db");
    const { submitEarlyAccess } = await import("@/modules/sign/early-access/service");
    const result = await submitEarlyAccess({
      email: `  ${email(1).toUpperCase()} `,
      company: "Acme",
      role: "Founder",
      source: "landing",
    });
    expect(result).toEqual({ ok: true, created: true });
    const row = await prisma.signEarlyAccess.findUniqueOrThrow({ where: { email: email(1) } });
    expect(row).toMatchObject({ company: "Acme", role: "Founder", source: "landing" });
  });

  it("duplicate email returns success without a second row", async () => {
    const { prisma } = await import("@/platform/db");
    const { submitEarlyAccess } = await import("@/modules/sign/early-access/service");
    expect(await submitEarlyAccess({ email: email(2) })).toEqual({ ok: true, created: true });
    expect(await submitEarlyAccess({ email: email(2).toUpperCase(), company: "Other" })).toEqual({
      ok: true,
      created: false,
    });
    expect(await prisma.signEarlyAccess.count({ where: { email: email(2) } })).toBe(1);
    const row = await prisma.signEarlyAccess.findUniqueOrThrow({ where: { email: email(2) } });
    expect(row.company).toBeNull(); // first signup wins; no overwrite
  });

  it("honeypot submission is rejected and stores nothing", async () => {
    const { prisma } = await import("@/platform/db");
    const { submitEarlyAccess } = await import("@/modules/sign/early-access/service");
    const { EARLY_ACCESS_HONEYPOT_FIELD } = await import("@/modules/sign/early-access/schema");
    expect(await submitEarlyAccess({ email: email(3), [EARLY_ACCESS_HONEYPOT_FIELD]: "https://spam.example" })).toEqual({
      ok: false,
      reason: "honeypot",
    });
    expect(await prisma.signEarlyAccess.count({ where: { email: email(3) } })).toBe(0);
  });

  it("invalid email is rejected and stores nothing", async () => {
    const { prisma } = await import("@/platform/db");
    const { submitEarlyAccess } = await import("@/modules/sign/early-access/service");
    expect(await submitEarlyAccess({ email: `${RUN}-not-an-email` })).toEqual({ ok: false, reason: "invalid_email" });
    expect(await prisma.signEarlyAccess.count({ where: { email: { startsWith: `${RUN}-not-an-email` } } })).toBe(0);
  });

  it("the integration reset never truncates sign_early_access", async () => {
    const { prisma } = await import("@/platform/db");
    const { submitEarlyAccess } = await import("@/modules/sign/early-access/service");
    const { resetPlatformSignTables } = await import("@/platform/db/test-support/integration-db");
    await submitEarlyAccess({ email: email(5) });
    const truncated = await resetPlatformSignTables(prisma);
    expect(truncated).not.toContain("sign_early_access");
    expect(await prisma.signEarlyAccess.count({ where: { email: email(5) } })).toBe(1);
  });
});
