import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const cookieStore = new Map<string, string>();
const cookieSet = vi.fn<(name: string, value: string, options?: Record<string, unknown>) => void>(
  (name, value) => {
    cookieStore.set(name, value);
  }
);

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (cookieStore.has(name) ? { name, value: cookieStore.get(name)! } : undefined),
    set: cookieSet,
  }),
}));

const redirect = vi.fn((to: string) => {
  throw new Error(`NEXT_REDIRECT:${to}`);
});
vi.mock("next/navigation", () => ({ redirect: (to: string) => redirect(to) }));

const db = {
  platformSession: {
    create: vi.fn(),
    findUnique: vi.fn(),
    updateMany: vi.fn(),
  },
};

vi.mock("@/platform/db", () => ({
  prisma: db,
  withDbRetry: <T,>(fn: () => Promise<T>) => fn(),
}));

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const ACTIVE = { id: "cust_1", email: "jane@example.com", name: null, status: "ACTIVE" };

function sessionRow(overrides: Record<string, unknown> = {}) {
  const now = Date.now();
  return {
    id: "sess_1",
    revokedAt: null,
    createdAt: new Date(now - DAY),
    lastSeenAt: new Date(now - 5 * 60 * 1000), // 5 minutes ago
    expiresAt: new Date(now + 29 * DAY),
    customer: ACTIVE,
    ...overrides,
  };
}

async function load() {
  return import("@/platform/auth/session");
}

describe("platform auth sessions", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("SESSION_SECRET", "base64:dGVzdF9zZXNzaW9uX3NlY3JldF8zMmJ5dGVzISEhISE=");
    vi.stubEnv("TOKEN_PEPPER", "base64:dGVzdF90b2tlbl9wZXBwZXJfMzJieXRlcyEhISEhIQ==");
    cookieStore.clear();
    cookieSet.mockClear();
    redirect.mockClear();
    for (const fn of Object.values(db.platformSession)) fn.mockReset();
    db.platformSession.updateMany.mockResolvedValue({ count: 1 });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe("creation", () => {
    it("stores only the token hash (32-byte base64url token), never the raw token", async () => {
      const { createCustomerSession } = await load();
      const { hashSessionToken } = await import("@/platform/auth/crypto");
      db.platformSession.create.mockResolvedValue({});

      const { rawToken, expiresAt } = await createCustomerSession("cust_1");

      expect(rawToken).toMatch(/^[A-Za-z0-9_-]{43}$/); // 32 bytes base64url
      const { data } = db.platformSession.create.mock.calls[0][0];
      expect(data.tokenHash).toBe(hashSessionToken(rawToken));
      expect(data.tokenHash).toMatch(/^[a-f0-9]{64}$/);
      expect(JSON.stringify(db.platformSession.create.mock.calls)).not.toContain(rawToken);
      expect(expiresAt.getTime() - Date.now()).toBeGreaterThan(29 * DAY);
    });

    it("creates a different token every time (never reused)", async () => {
      const { createCustomerSession } = await load();
      db.platformSession.create.mockResolvedValue({});
      const a = await createCustomerSession("cust_1");
      const b = await createCustomerSession("cust_1");
      expect(a.rawToken).not.toBe(b.rawToken);
    });

    it("uses the transaction client when given, and records ip / truncated user agent", async () => {
      const { createCustomerSession } = await load();
      const tx = { platformSession: { create: vi.fn().mockResolvedValue({}) } };
      await createCustomerSession("cust_1", { tx: tx as never, ip: "203.0.113.7", userAgent: "x".repeat(2000) });
      expect(db.platformSession.create).not.toHaveBeenCalled();
      const { data } = tx.platformSession.create.mock.calls[0][0];
      expect(data.ip).toBe("203.0.113.7");
      expect(data.userAgent).toHaveLength(512);
    });
  });

  describe("cookie", () => {
    it('is "kk_session" outside production with httpOnly, lax, path /, not secure, no domain', async () => {
      const { sessionCookieName } = await import("@/platform/auth/constants");
      const mod = await load();
      expect(sessionCookieName()).toBe("kk_session");
      await mod.setSessionCookie("raw");
      const [name, value, options] = cookieSet.mock.calls.at(-1)!;
      expect(name).toBe("kk_session");
      expect(value).toBe("raw");
      expect(options).toEqual({ httpOnly: true, secure: false, sameSite: "lax", path: "/", maxAge: 90 * 24 * 60 * 60 });
      expect(options).not.toHaveProperty("domain");
    });

    it('is "__Host-kk_session" in production, secure, path /, no domain', async () => {
      vi.stubEnv("NODE_ENV", "production");
      const { sessionCookieName } = await import("@/platform/auth/constants");
      const mod = await load();
      expect(sessionCookieName()).toBe("__Host-kk_session");
      await mod.setSessionCookie("raw");
      const [name, , options] = cookieSet.mock.calls.at(-1)!;
      expect(name).toBe("__Host-kk_session");
      expect(options).toMatchObject({ httpOnly: true, secure: true, sameSite: "lax", path: "/" });
      expect(options).not.toHaveProperty("domain");
    });
  });

  describe("getCurrentCustomer", () => {
    it("returns the ACTIVE customer for a valid cookie, looked up by hash", async () => {
      const { getCurrentCustomer } = await load();
      const { hashSessionToken } = await import("@/platform/auth/crypto");
      cookieStore.set("kk_session", "raw-token");
      db.platformSession.findUnique.mockResolvedValue(sessionRow());

      expect(await getCurrentCustomer()).toEqual(ACTIVE);
      expect(db.platformSession.findUnique.mock.calls[0][0].where).toEqual({ tokenHash: hashSessionToken("raw-token") });
    });

    it.each([
      ["no cookie", null],
      ["unknown token", "unknown"],
      ["revoked", sessionRow({ revokedAt: new Date() })],
      ["idle-expired", sessionRow({ expiresAt: new Date(Date.now() - 1) })],
      ["older than 90 days", sessionRow({ createdAt: new Date(Date.now() - 91 * DAY), expiresAt: new Date(Date.now() + DAY) })],
      ["SUSPENDED customer", sessionRow({ customer: { ...ACTIVE, status: "SUSPENDED" } })],
    ])("returns null: %s", async (_label, row) => {
      const { getCurrentCustomer } = await load();
      if (row !== null) cookieStore.set("kk_session", "raw-token");
      db.platformSession.findUnique.mockResolvedValue(row === "unknown" ? null : row);
      expect(await getCurrentCustomer()).toBeNull();
    });
  });

  describe("sliding expiry", () => {
    it("does not write when lastSeenAt is less than an hour old", async () => {
      const { getCurrentCustomer } = await load();
      cookieStore.set("kk_session", "raw-token");
      db.platformSession.findUnique.mockResolvedValue(sessionRow({ lastSeenAt: new Date(Date.now() - 59 * 60 * 1000) }));
      await getCurrentCustomer();
      expect(db.platformSession.updateMany).not.toHaveBeenCalled();
    });

    it("extends lastSeenAt/expiresAt (+30 days) once lastSeenAt is over an hour old", async () => {
      const { getCurrentCustomer } = await load();
      cookieStore.set("kk_session", "raw-token");
      const lastSeenAt = new Date(Date.now() - 2 * HOUR);
      db.platformSession.findUnique.mockResolvedValue(sessionRow({ lastSeenAt }));
      await getCurrentCustomer();
      const call = db.platformSession.updateMany.mock.calls[0][0];
      expect(call.where).toEqual({ id: "sess_1", lastSeenAt, revokedAt: null }); // conditional: one writer wins
      expect(call.data.expiresAt.getTime() - Date.now()).toBeGreaterThan(29.9 * DAY);
    });

    it("never extends expiresAt beyond createdAt + 90 days", async () => {
      const { nextSessionExpiry } = await load();
      const now = new Date("2026-10-09T12:00:00Z");
      const createdAt = new Date(now.getTime() - 80 * DAY);
      expect(nextSessionExpiry(createdAt, now).getTime()).toBe(createdAt.getTime() + 90 * DAY);
      const fresh = new Date(now.getTime() - DAY);
      expect(nextSessionExpiry(fresh, now).getTime()).toBe(now.getTime() + 30 * DAY);
    });

    it("shouldRefreshSession is throttled to once per hour", async () => {
      const { shouldRefreshSession } = await load();
      const now = new Date("2026-10-09T12:00:00Z");
      expect(shouldRefreshSession(new Date(now.getTime() - HOUR + 1), now)).toBe(false);
      expect(shouldRefreshSession(new Date(now.getTime() - HOUR), now)).toBe(true);
    });
  });

  describe("requireCustomer", () => {
    it("pages: redirects to login with next when signed out", async () => {
      const { requireCustomer } = await load();
      await expect(requireCustomer({ redirectToLoginFrom: "/tools/sign/documents/abc" })).rejects.toThrow(
        "NEXT_REDIRECT:/tools/sign/login?next=%2Ftools%2Fsign%2Fdocuments%2Fabc"
      );
    });

    it("APIs/actions: throws a 401 PlatformError when signed out", async () => {
      const { requireCustomer } = await load();
      await expect(requireCustomer()).rejects.toMatchObject({ status: 401, code: "unauthorized" });
    });

    it("returns the session when signed in", async () => {
      const { requireCustomer } = await load();
      cookieStore.set("kk_session", "raw-token");
      db.platformSession.findUnique.mockResolvedValue(sessionRow());
      await expect(requireCustomer()).resolves.toEqual({ sessionId: "sess_1", customer: ACTIVE });
    });
  });

  describe("revocation", () => {
    it("revokeSession marks the hashed row revoked and clears the cookie", async () => {
      const { revokeSession } = await load();
      const { hashSessionToken } = await import("@/platform/auth/crypto");
      cookieStore.set("kk_session", "raw-token");

      await revokeSession();

      const call = db.platformSession.updateMany.mock.calls[0][0];
      expect(call.where).toEqual({ tokenHash: hashSessionToken("raw-token"), revokedAt: null });
      expect(call.data.revokedAt).toBeInstanceOf(Date);
      const [name, value, options] = cookieSet.mock.calls.at(-1)!;
      expect([name, value]).toEqual(["kk_session", ""]);
      expect(options).toMatchObject({ maxAge: 0 });
    });

    it("revokeAllSessions revokes every active session of the customer", async () => {
      const { revokeAllSessions } = await load();
      db.platformSession.updateMany.mockResolvedValue({ count: 3 });
      expect(await revokeAllSessions("cust_1")).toBe(3);
      const call = db.platformSession.updateMany.mock.calls[0][0];
      expect(call.where).toEqual({ customerId: "cust_1", revokedAt: null });
      expect(call.data.revokedAt).toBeInstanceOf(Date);
    });
  });
});
