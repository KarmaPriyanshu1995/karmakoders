import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import {
  INTEGRATION_WARNING,
  assertSafeForIntegrationTests,
  integrationSkipReason,
  resetPlatformSignTables,
} from "@/platform/db/test-support/integration-db";

/** Sessions against the real DATABASE_URL database (Neon dev branch / CI postgres). */

const SKIP_REASON = integrationSkipReason();
if (SKIP_REASON) {
  console.warn(`[session.integration] SKIPPED: ${SKIP_REASON}`);
} else {
  assertSafeForIntegrationTests();
  console.warn(`[session.integration] ${INTEGRATION_WARNING}`);
}

let cookieValue: string | undefined;
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: () => (cookieValue ? { name: "kk_session", value: cookieValue } : undefined),
    set: () => undefined,
  }),
}));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

const DAY = 24 * 60 * 60 * 1000;
const RUN = `sess-it-${Date.now()}`;

describe.skipIf(Boolean(SKIP_REASON))("sessions (DATABASE_URL)", () => {
  let prisma: Awaited<typeof import("@/platform/db")>["prisma"];

  beforeAll(async () => {
    ({ prisma } = await import("@/platform/db"));
    await resetPlatformSignTables(prisma);
  });

  afterAll(async () => {
    if (prisma) await resetPlatformSignTables(prisma);
  });

  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("SESSION_SECRET", "base64:dGVzdF9zZXNzaW9uX3NlY3JldF8zMmJ5dGVzISEhISE=");
    cookieValue = undefined;
  });

  async function newCustomer(suffix: string, status: "ACTIVE" | "SUSPENDED" = "ACTIVE") {
    return prisma.platformCustomer.create({ data: { email: `${RUN}-${suffix}@example.test`, status } });
  }

  it("logout everywhere revokes every session of that customer only", async () => {
    const { createCustomerSession, revokeAllSessions } = await import("@/platform/auth/session");
    const a = await newCustomer("a");
    const b = await newCustomer("b");
    await createCustomerSession(a.id);
    await createCustomerSession(a.id);
    await createCustomerSession(b.id);

    expect(await revokeAllSessions(a.id)).toBe(2);
    expect(await prisma.platformSession.count({ where: { customerId: a.id, revokedAt: null } })).toBe(0);
    expect(await prisma.platformSession.count({ where: { customerId: b.id, revokedAt: null } })).toBe(1);
  });

  it("rejects a SUSPENDED customer's otherwise valid session", async () => {
    const { createCustomerSession, getCurrentCustomer } = await import("@/platform/auth/session");
    const c = await newCustomer("suspended", "SUSPENDED");
    cookieValue = (await createCustomerSession(c.id)).rawToken;
    expect(await getCurrentCustomer()).toBeNull();
  });

  it("accepts a fresh session and rejects it after the 90-day absolute limit", async () => {
    const { createCustomerSession, getCurrentCustomer } = await import("@/platform/auth/session");
    const { hashSessionToken } = await import("@/platform/auth/crypto");
    const c = await newCustomer("absolute");
    const { rawToken } = await createCustomerSession(c.id);
    cookieValue = rawToken;
    expect((await getCurrentCustomer())?.id).toBe(c.id);

    vi.resetModules(); // new request scope (React cache)
    await prisma.platformSession.updateMany({
      where: { tokenHash: hashSessionToken(rawToken) },
      data: { createdAt: new Date(Date.now() - 91 * DAY), expiresAt: new Date(Date.now() + DAY) },
    });
    const fresh = await import("@/platform/auth/session");
    expect(await fresh.getCurrentCustomer()).toBeNull();
  });

  it("slides expiresAt only when lastSeenAt is over an hour old", async () => {
    const { createCustomerSession, getCurrentCustomer } = await import("@/platform/auth/session");
    const { hashSessionToken } = await import("@/platform/auth/crypto");
    const c = await newCustomer("sliding");
    const { rawToken } = await createCustomerSession(c.id);
    cookieValue = rawToken;
    const where = { tokenHash: hashSessionToken(rawToken) };

    const before = await prisma.platformSession.findUniqueOrThrow({ where });
    await getCurrentCustomer();
    const unchanged = await prisma.platformSession.findUniqueOrThrow({ where });
    expect(unchanged.lastSeenAt.getTime()).toBe(before.lastSeenAt.getTime()); // < 1 hour: no write

    await prisma.platformSession.update({
      where,
      data: { lastSeenAt: new Date(Date.now() - 2 * 60 * 60 * 1000), expiresAt: new Date(Date.now() + DAY) },
    });
    vi.resetModules();
    const fresh = await import("@/platform/auth/session");
    await fresh.getCurrentCustomer();
    const slid = await prisma.platformSession.findUniqueOrThrow({ where });
    expect(slid.expiresAt.getTime() - Date.now()).toBeGreaterThan(29 * DAY);
  });
});
