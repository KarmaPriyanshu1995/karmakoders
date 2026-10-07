import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import {
  INTEGRATION_WARNING,
  assertSafeForIntegrationTests,
  integrationSkipReason,
  resetPlatformSignTables,
} from "@/platform/db/test-support/integration-db";

/**
 * OTP request/verify against the real DATABASE_URL database (Neon dev branch locally,
 * postgres service container in CI). Clears platform_* / sign_* tables before and after.
 */

const SKIP_REASON = integrationSkipReason();
if (SKIP_REASON) {
  console.warn(`[otp.integration] SKIPPED: ${SKIP_REASON}`);
} else {
  assertSafeForIntegrationTests();
  console.warn(`[otp.integration] ${INTEGRATION_WARNING}`);
}

vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => undefined, set: () => undefined }),
}));

const sentCodes: string[] = [];
vi.mock("@/platform/email", () => ({
  sendOtpEmail: async (input: { code: string }) => {
    sentCodes.push(input.code);
  },
}));

const RUN = `otp-it-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
let counter = 0;
const nextEmail = () => `${RUN}-${++counter}@example.test`;

describe.skipIf(Boolean(SKIP_REASON))("OTP integration (DATABASE_URL)", () => {
  beforeAll(async () => {
    const { prisma } = await import("@/platform/db");
    await resetPlatformSignTables(prisma);
  });

  beforeEach(() => {
    vi.stubEnv("SESSION_SECRET", "base64:dGVzdF9zZXNzaW9uX3NlY3JldF8zMmJ5dGVzISEhISE=");
    vi.stubEnv("TOKEN_PEPPER", "base64:dGVzdF90b2tlbl9wZXBwZXJfMzJieXRlcyEhISEhIQ==");
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
  });

  afterAll(async () => {
    const { prisma } = await import("@/platform/db");
    await resetPlatformSignTables(prisma);
  });

  async function requestCode(email: string) {
    const { requestCustomerOtp } = await import("@/platform/auth/otp");
    await requestCustomerOtp({ email });
    return sentCodes.at(-1)!;
  }

  function wrongCodeFor(code: string) {
    return code === "000000" ? "111111" : "000000";
  }

  it("requesting a new code invalidates previous unconsumed codes", async () => {
    const { prisma } = await import("@/platform/db");
    const { verifyCustomerOtp, OTP_INVALID_MESSAGE } = await import("@/platform/auth/otp");
    const email = nextEmail();
    const first = await requestCode(email);
    const second = await requestCode(email);

    const open = await prisma.platformOtp.findMany({ where: { email, consumedAt: null } });
    expect(open).toHaveLength(1);

    if (first !== second) {
      await expect(verifyCustomerOtp({ email, code: first })).rejects.toThrow(OTP_INVALID_MESSAGE);
    }
    await expect(verifyCustomerOtp({ email, code: second })).resolves.toBeDefined();
  });

  it("correct code creates the customer (0 credits) and exactly one session", async () => {
    const { prisma } = await import("@/platform/db");
    const { verifyCustomerOtp } = await import("@/platform/auth/otp");
    const email = nextEmail();
    const code = await requestCode(email);

    const { customer } = await verifyCustomerOtp({ email, code });

    expect(customer.email).toBe(email);
    const row = await prisma.platformCustomer.findUniqueOrThrow({ where: { email } });
    expect(row.creditsBalance).toBe(0);
    expect(row.lastLoginAt).not.toBeNull();
    expect(await prisma.platformSession.count({ where: { customerId: customer.id } })).toBe(1);
    const challenge = await prisma.platformOtp.findFirst({ where: { email } });
    expect(challenge?.consumedAt).not.toBeNull();
    expect(challenge?.attempts).toBe(1);
  });

  it("wrong code increments attempts and creates nothing", async () => {
    const { prisma } = await import("@/platform/db");
    const { verifyCustomerOtp, OTP_INVALID_MESSAGE } = await import("@/platform/auth/otp");
    const email = nextEmail();
    const code = await requestCode(email);

    await expect(verifyCustomerOtp({ email, code: wrongCodeFor(code) })).rejects.toThrow(OTP_INVALID_MESSAGE);

    const challenge = await prisma.platformOtp.findFirst({ where: { email } });
    expect(challenge?.attempts).toBe(1);
    expect(challenge?.consumedAt).toBeNull();
    expect(await prisma.platformCustomer.count({ where: { email } })).toBe(0);
  });

  it("max attempts blocks even the correct code", async () => {
    const { prisma } = await import("@/platform/db");
    const { verifyCustomerOtp, OTP_INVALID_MESSAGE } = await import("@/platform/auth/otp");
    const { OTP_MAX_ATTEMPTS } = await import("@/platform/auth/constants");
    const email = nextEmail();
    const code = await requestCode(email);

    for (let i = 0; i < OTP_MAX_ATTEMPTS; i++) {
      await expect(verifyCustomerOtp({ email, code: wrongCodeFor(code) })).rejects.toThrow(OTP_INVALID_MESSAGE);
    }
    await expect(verifyCustomerOtp({ email, code })).rejects.toThrow(OTP_INVALID_MESSAGE);

    const challenge = await prisma.platformOtp.findFirst({ where: { email } });
    expect(challenge?.attempts).toBe(OTP_MAX_ATTEMPTS);
    expect(await prisma.platformCustomer.count({ where: { email } })).toBe(0);
  });

  it("expired code is rejected with the generic error", async () => {
    const { prisma } = await import("@/platform/db");
    const { verifyCustomerOtp, OTP_INVALID_MESSAGE } = await import("@/platform/auth/otp");
    const email = nextEmail();
    const code = await requestCode(email);
    await prisma.platformOtp.updateMany({
      where: { email },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    await expect(verifyCustomerOtp({ email, code })).rejects.toThrow(OTP_INVALID_MESSAGE);
    expect(await prisma.platformCustomer.count({ where: { email } })).toBe(0);
  });

  it("two concurrent verifies with the correct code produce exactly ONE session", async () => {
    const { prisma } = await import("@/platform/db");
    const { verifyCustomerOtp } = await import("@/platform/auth/otp");
    const email = nextEmail();
    const code = await requestCode(email);

    const results = await Promise.allSettled([
      verifyCustomerOtp({ email, code }),
      verifyCustomerOtp({ email, code }),
    ]);

    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((r) => r.status === "rejected")).toHaveLength(1);
    const customer = await prisma.platformCustomer.findUniqueOrThrow({ where: { email } });
    expect(await prisma.platformSession.count({ where: { customerId: customer.id } })).toBe(1);
  });
});
