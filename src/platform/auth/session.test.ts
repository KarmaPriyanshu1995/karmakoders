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

const db = {
  platformSession: {
    create: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
  },
};

vi.mock("@/platform/db", () => ({
  prisma: db,
  withDbRetry: <T,>(fn: () => Promise<T>) => fn(),
}));

const CUSTOMER = { id: "cust_1", email: "jane@example.com", name: null, status: "ACTIVE" };

async function load() {
  return import("@/platform/auth/session");
}

describe("platform auth sessions", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("SESSION_SECRET", "base64:dGVzdF9zZXNzaW9uX3NlY3JldF8zMmJ5dGVzISEhISE=");
    vi.stubEnv("TOKEN_PEPPER", "base64:dGVzdF90b2tlbl9wZXBwZXJfMzJieXRlcyEhISEhIQ==");
    cookieStore.clear();
    cookieSet.mockClear();
    for (const fn of Object.values(db.platformSession)) fn.mockReset();
    db.platformSession.update.mockResolvedValue({});
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("stores only the token hash, never the raw token", async () => {
    const { createCustomerSession } = await load();
    const { hashSessionToken } = await import("@/platform/auth/crypto");
    db.platformSession.create.mockResolvedValue({});

    const { rawToken, expiresAt } = await createCustomerSession("cust_1");

    const { data } = db.platformSession.create.mock.calls[0][0];
    expect(data.tokenHash).toBe(hashSessionToken(rawToken));
    expect(data.tokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(JSON.stringify(db.platformSession.create.mock.calls)).not.toContain(rawToken);
    expect(data.expiresAt).toEqual(expiresAt);
    expect(expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  it("uses the transaction client when given", async () => {
    const { createCustomerSession } = await load();
    const tx = { platformSession: { create: vi.fn().mockResolvedValue({}) } };
    await createCustomerSession("cust_1", { tx: tx as never });
    expect(tx.platformSession.create).toHaveBeenCalledTimes(1);
    expect(db.platformSession.create).not.toHaveBeenCalled();
  });

  it("records ip and a truncated user agent", async () => {
    const { createCustomerSession } = await load();
    db.platformSession.create.mockResolvedValue({});
    await createCustomerSession("cust_1", { ip: "203.0.113.7", userAgent: "x".repeat(2000) });
    const { data } = db.platformSession.create.mock.calls[0][0];
    expect(data.ip).toBe("203.0.113.7");
    expect(data.userAgent).toHaveLength(512);
  });

  it("returns the session for a valid cookie, looked up by hash", async () => {
    const { getCustomerSession } = await load();
    const { hashSessionToken } = await import("@/platform/auth/crypto");
    cookieStore.set("kk_session", "raw-token");
    db.platformSession.findUnique.mockResolvedValue({
      id: "sess_1",
      revokedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
      customer: CUSTOMER,
    });

    const session = await getCustomerSession();
    expect(session).toEqual({ sessionId: "sess_1", customer: CUSTOMER });
    expect(db.platformSession.findUnique.mock.calls[0][0].where).toEqual({
      tokenHash: hashSessionToken("raw-token"),
    });
  });

  it("returns null for expired sessions", async () => {
    const { getCustomerSession } = await load();
    cookieStore.set("kk_session", "raw-token");
    db.platformSession.findUnique.mockResolvedValue({
      id: "sess_1",
      revokedAt: null,
      expiresAt: new Date(Date.now() - 1),
      customer: CUSTOMER,
    });
    expect(await getCustomerSession()).toBeNull();
  });

  it("returns null for revoked sessions and when no cookie is present", async () => {
    const { getCustomerSession } = await load();
    expect(await getCustomerSession()).toBeNull();
    expect(db.platformSession.findUnique).not.toHaveBeenCalled();

    cookieStore.set("kk_session", "raw-token");
    db.platformSession.findUnique.mockResolvedValue({
      id: "sess_1",
      revokedAt: new Date(),
      expiresAt: new Date(Date.now() + 60_000),
      customer: CUSTOMER,
    });
    expect(await getCustomerSession()).toBeNull();
  });

  it("revocation marks the hashed row revoked and clears the cookie", async () => {
    const { revokeCustomerSession } = await load();
    const { hashSessionToken } = await import("@/platform/auth/crypto");
    cookieStore.set("kk_session", "raw-token");
    db.platformSession.updateMany.mockResolvedValue({ count: 1 });

    await revokeCustomerSession();

    const call = db.platformSession.updateMany.mock.calls[0][0];
    expect(call.where).toEqual({ tokenHash: hashSessionToken("raw-token"), revokedAt: null });
    expect(call.data.revokedAt).toBeInstanceOf(Date);
    const [name, value, options] = cookieSet.mock.calls.at(-1)!;
    expect(name).toBe("kk_session");
    expect(value).toBe("");
    expect(options).toMatchObject({ maxAge: 0 });
  });

  it("sets cookie flags: httpOnly, sameSite lax, path /, secure only in production", async () => {
    vi.stubEnv("NODE_ENV", "test");
    let mod = await load();
    expect(mod.sessionCookieOptions(60)).toEqual({
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      path: "/",
      maxAge: 60,
    });

    vi.stubEnv("NODE_ENV", "production");
    vi.resetModules();
    mod = await load();
    expect(mod.sessionCookieOptions(60)).toMatchObject({ httpOnly: true, secure: true, sameSite: "lax", path: "/" });

    await mod.setSessionCookie("raw", new Date(Date.now() + 120_000));
    const [name, value, options] = cookieSet.mock.calls.at(-1)!;
    expect(name).toBe("kk_session");
    expect(value).toBe("raw");
    expect(options).toMatchObject({ httpOnly: true, secure: true, sameSite: "lax", path: "/" });
  });
});
