import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Unit tests for the OTP flow with a mocked Prisma client.
 * Real-database behaviour (including concurrency) is in otp.integration.test.ts.
 */

const sendOtpEmail = vi.fn();
vi.mock("@/platform/email", () => ({ sendOtpEmail: (...a: unknown[]) => sendOtpEmail(...a) }));

const setSessionCookie = vi.fn();
const createCustomerSession = vi.fn();
vi.mock("@/platform/auth/session", () => ({
  setSessionCookie: (...a: unknown[]) => setSessionCookie(...a),
  createCustomerSession: (...a: unknown[]) => createCustomerSession(...a),
}));

const tx = {
  platformOtp: { updateMany: vi.fn() },
  platformCustomer: { upsert: vi.fn() },
};

const prisma = {
  platformOtp: { updateMany: vi.fn(), create: vi.fn(), findFirst: vi.fn() },
  $transaction: vi.fn(),
};

vi.mock("@/platform/db", () => ({
  prisma,
  withDbRetry: <T,>(fn: () => Promise<T>) => fn(),
}));

const EMAIL = "jane@example.com";

async function load() {
  const otp = await import("@/platform/auth/otp");
  const crypto = await import("@/platform/auth/crypto");
  return { ...otp, ...crypto };
}

describe("OTP flow (mocked DB)", () => {
  let logs: string;

  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("SESSION_SECRET", "base64:dGVzdF9zZXNzaW9uX3NlY3JldF8zMmJ5dGVzISEhISE=");
    vi.stubEnv("TOKEN_PEPPER", "base64:dGVzdF90b2tlbl9wZXBwZXJfMzJieXRlcyEhISEhIQ==");
    for (const group of [prisma.platformOtp, tx.platformOtp, tx.platformCustomer]) {
      for (const fn of Object.values(group)) fn.mockReset();
    }
    prisma.$transaction.mockReset();
    sendOtpEmail.mockReset().mockResolvedValue(undefined);
    setSessionCookie.mockReset().mockResolvedValue(undefined);
    createCustomerSession.mockReset().mockResolvedValue({ rawToken: "raw", expiresAt: new Date(Date.now() + 1000) });
    logs = "";
    for (const m of ["info", "warn", "error", "log"] as const) {
      vi.spyOn(console, m).mockImplementation((...args: unknown[]) => {
        logs += args.map(String).join(" ") + "\n";
      });
    }
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  describe("requestCustomerOtp", () => {
    it("invalidates previous unconsumed codes and creates a new one in one transaction", async () => {
      const { requestCustomerOtp } = await load();
      prisma.platformOtp.updateMany.mockReturnValue("updateMany-op");
      prisma.platformOtp.create.mockReturnValue("create-op");
      prisma.$transaction.mockResolvedValue([]);

      await requestCustomerOtp({ email: " Jane@Example.com " });

      expect(prisma.$transaction).toHaveBeenCalledWith(["updateMany-op", "create-op"]);
      expect(prisma.platformOtp.updateMany.mock.calls[0][0].where).toEqual({
        email: EMAIL,
        purpose: "LOGIN",
        consumedAt: null,
      });
      const created = prisma.platformOtp.create.mock.calls[0][0].data;
      expect(created.email).toBe(EMAIL);
      expect(created.codeHash).toMatch(/^[a-f0-9]{64}$/);

      const sentCode = sendOtpEmail.mock.calls[0][0].code as string;
      expect(sentCode).toMatch(/^\d{6}$/);
      expect(JSON.stringify(created)).not.toContain(`"${sentCode}"`);
      expect(logs).not.toContain(sentCode);
      expect(logs).not.toContain(EMAIL);
    });

    it("rejects an invalid email before touching the DB", async () => {
      const { requestCustomerOtp } = await load();
      await expect(requestCustomerOtp({ email: "nope" })).rejects.toMatchObject({ code: "bad_request" });
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });
  });

  describe("verifyCustomerOtp", () => {
    async function setupChallenge(code: string) {
      const mod = await load();
      prisma.platformOtp.findFirst.mockResolvedValue({
        id: "ch_1",
        codeHash: mod.hashOtpCode({ email: EMAIL, purpose: "LOGIN", code }),
      });
      prisma.$transaction.mockImplementation(async (fn: (t: typeof tx) => unknown) => fn(tx));
      tx.platformCustomer.upsert.mockResolvedValue({ id: "cust_1", email: EMAIL, name: null, status: "ACTIVE" });
      return mod;
    }

    it("correct code: increments, consumes, upserts customer and creates session in the tx", async () => {
      const { verifyCustomerOtp } = await setupChallenge("123456");
      tx.platformOtp.updateMany.mockResolvedValue({ count: 1 });

      const { customer } = await verifyCustomerOtp({
        email: EMAIL,
        code: "123456",
        client: { ip: "203.0.113.7", userAgent: "Vitest" },
      });

      expect(customer.id).toBe("cust_1");
      const [increment, consume] = tx.platformOtp.updateMany.mock.calls.map((c) => c[0]);
      expect(increment.where).toMatchObject({ id: "ch_1", attempts: { lt: 5 }, consumedAt: null });
      expect(increment.where.expiresAt.gt).toBeInstanceOf(Date);
      expect(increment.data).toEqual({ attempts: { increment: 1 } });
      expect(consume.where).toEqual({ id: "ch_1", consumedAt: null });
      const upsert = tx.platformCustomer.upsert.mock.calls[0][0];
      expect(upsert.where).toEqual({ email: EMAIL });
      expect(upsert.create.lastLoginAt).toBeInstanceOf(Date);
      expect(upsert.update.lastLoginAt).toBeInstanceOf(Date);
      expect(createCustomerSession).toHaveBeenCalledWith("cust_1", {
        tx,
        ip: "203.0.113.7",
        userAgent: "Vitest",
      });
      expect(setSessionCookie).toHaveBeenCalledWith("raw", expect.any(Date));
    });

    it("wrong code: increments attempts (committed) and returns the generic error", async () => {
      const { verifyCustomerOtp, OTP_INVALID_MESSAGE } = await setupChallenge("123456");
      tx.platformOtp.updateMany.mockResolvedValue({ count: 1 });

      await expect(verifyCustomerOtp({ email: EMAIL, code: "654321" })).rejects.toMatchObject({
        message: OTP_INVALID_MESSAGE,
        status: 401,
      });
      expect(tx.platformOtp.updateMany).toHaveBeenCalledTimes(1); // increment only
      expect(tx.platformCustomer.upsert).not.toHaveBeenCalled();
      expect(setSessionCookie).not.toHaveBeenCalled();
      expect(logs).toContain("wrong_code");
      expect(logs).not.toContain("654321");
      expect(logs).not.toContain(EMAIL);
    });

    it("expired or max-attempts challenge: generic error, no consume", async () => {
      const { verifyCustomerOtp, OTP_INVALID_MESSAGE } = await setupChallenge("123456");
      tx.platformOtp.updateMany.mockResolvedValue({ count: 0 });

      await expect(verifyCustomerOtp({ email: EMAIL, code: "123456" })).rejects.toThrow(OTP_INVALID_MESSAGE);
      expect(tx.platformOtp.updateMany).toHaveBeenCalledTimes(1);
      expect(logs).toContain("expired_or_locked");
    });

    it("lost consume race: aborts the transaction with the generic error", async () => {
      const { verifyCustomerOtp, OTP_INVALID_MESSAGE } = await setupChallenge("123456");
      tx.platformOtp.updateMany
        .mockResolvedValueOnce({ count: 1 })
        .mockResolvedValueOnce({ count: 0 });

      await expect(verifyCustomerOtp({ email: EMAIL, code: "123456" })).rejects.toThrow(OTP_INVALID_MESSAGE);
      expect(tx.platformCustomer.upsert).not.toHaveBeenCalled();
      expect(createCustomerSession).not.toHaveBeenCalled();
      expect(logs).toContain("consume_conflict");
    });

    it("no active challenge (unknown email): same generic error", async () => {
      const { verifyCustomerOtp, OTP_INVALID_MESSAGE } = await load();
      prisma.platformOtp.findFirst.mockResolvedValue(null);
      await expect(verifyCustomerOtp({ email: EMAIL, code: "123456" })).rejects.toThrow(OTP_INVALID_MESSAGE);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it("malformed code: same generic error", async () => {
      const { verifyCustomerOtp, OTP_INVALID_MESSAGE } = await load();
      await expect(verifyCustomerOtp({ email: EMAIL, code: "12ab56" })).rejects.toThrow(OTP_INVALID_MESSAGE);
      expect(prisma.platformOtp.findFirst).not.toHaveBeenCalled();
    });
  });
});
