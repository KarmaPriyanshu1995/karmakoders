import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const verifyCustomerOtp = vi.fn();
const requestCustomerOtp = vi.fn();
const getCurrentSession = vi.fn();
const revokeSession = vi.fn();
const revokeAllSessions = vi.fn();
const clearSessionCookie = vi.fn();
const findUnique = vi.fn();

vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined, set: vi.fn() }) }));
vi.mock("@/platform/db", () => ({
  prisma: { platformCustomer: { findUnique: (...a: unknown[]) => findUnique(...a) } },
  withDbRetry: <T,>(fn: () => Promise<T>) => fn(),
}));
vi.mock("@/platform/auth/otp", () => ({
  verifyCustomerOtp: (...a: unknown[]) => verifyCustomerOtp(...a),
  requestCustomerOtp: (...a: unknown[]) => requestCustomerOtp(...a),
  OTP_INVALID_MESSAGE: "x",
}));
vi.mock("@/platform/auth/session", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/platform/auth/session")>();
  return {
    ...actual,
    getCurrentSession: () => getCurrentSession(),
    revokeSession: () => revokeSession(),
    revokeAllSessions: (id: string) => revokeAllSessions(id),
    clearSessionCookie: () => clearSessionCookie(),
    requireCustomer: async () => {
      const s = await getCurrentSession();
      if (!s) {
        const { PlatformError } = await import("@/platform/errors");
        throw new PlatformError("unauthorized", "Sign in required");
      }
      return s;
    },
  };
});
vi.mock("@/platform/rate-limit", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/platform/rate-limit")>();
  return {
    ...actual,
    consumePlatformRateLimit: vi.fn(async () => ({ allowed: true, remaining: 1, retryAfterSec: 1 })),
    clientIpFromRequest: () => "203.0.113.7",
  };
});

const request = await import("@/app/api/platform/auth/otp/request/route");
const verify = await import("@/app/api/platform/auth/otp/verify/route");
const me = await import("@/app/api/platform/auth/me/route");
const logout = await import("@/app/api/platform/auth/logout/route");
const logoutAll = await import("@/app/api/platform/auth/logout-all/route");

const ORIGIN = "https://www.karmakoders.com";
const call = (path: string, method: "GET" | "POST", body?: unknown, origin: string | null = ORIGIN) =>
  new Request(`${ORIGIN}/api/platform/auth/${path}`, {
    method,
    headers: { "Content-Type": "application/json", ...(origin ? { origin } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

const routes = () => [
  ["otp/request", () => request.POST(call("otp/request", "POST", { email: "jane@example.com" }))],
  ["otp/verify", () => verify.POST(call("otp/verify", "POST", { email: "jane@example.com", code: "123456" }))],
  ["logout", () => logout.POST(call("logout", "POST"))],
  ["logout-all", () => logoutAll.POST(call("logout-all", "POST"))],
  ["me", () => me.GET(call("me", "GET"))],
] as const;

const SESSION = { sessionId: "s1", customer: { id: "c1", email: "jane@example.com", name: null, status: "ACTIVE" } };

beforeEach(() => {
  vi.stubEnv("APP_URL", ORIGIN);
  vi.stubEnv("NODE_ENV", "test");
  for (const fn of [verifyCustomerOtp, requestCustomerOtp, getCurrentSession, revokeSession, revokeAllSessions, clearSessionCookie, findUnique]) {
    fn.mockReset();
  }
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("auth API routes honour SIGN_APP_ENABLED", () => {
  it.each(routes())("%s → 404 JSON and does nothing when disabled", async (_name, run) => {
    vi.stubEnv("SIGN_APP_ENABLED", "false");
    const res = await run();
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "Not found", code: "not_found" });
    for (const fn of [verifyCustomerOtp, requestCustomerOtp, getCurrentSession, revokeSession, revokeAllSessions]) {
      expect(fn).not.toHaveBeenCalled();
    }
  });
});

describe("when enabled", () => {
  beforeEach(() => vi.stubEnv("SIGN_APP_ENABLED", "true"));

  it("otp/request, otp/verify and logout work", async () => {
    requestCustomerOtp.mockResolvedValue({ ok: true });
    verifyCustomerOtp.mockResolvedValue({ customer: { id: "c1", email: "jane@example.com", name: null } });
    expect((await request.POST(call("otp/request", "POST", { email: "jane@example.com" }))).status).toBe(200);
    expect((await verify.POST(call("otp/verify", "POST", { email: "jane@example.com", code: "123456" }))).status).toBe(200);
    expect((await logout.POST(call("logout", "POST"))).status).toBe(200);
    expect(revokeSession).toHaveBeenCalledTimes(1);
  });

  it.each(["otp/request", "otp/verify", "logout", "logout-all"] as const)(
    "POST %s rejects a foreign or missing Origin with 403 (CSRF)",
    async (path) => {
      const handler = { "otp/request": request.POST, "otp/verify": verify.POST, logout: logout.POST, "logout-all": logoutAll.POST }[path];
      for (const origin of ["https://evil.example", null]) {
        const res = await handler(call(path, "POST", { email: "jane@example.com", code: "123456" }, origin));
        expect(res.status, `${path} ${origin}`).toBe(403);
        expect((await res.json()).code).toBe("forbidden");
      }
      expect(requestCustomerOtp).not.toHaveBeenCalled();
      expect(verifyCustomerOtp).not.toHaveBeenCalled();
      expect(revokeSession).not.toHaveBeenCalled();
      expect(revokeAllSessions).not.toHaveBeenCalled();
    }
  );

  it("me and logout-all → 401 when signed out", async () => {
    getCurrentSession.mockResolvedValue(null);
    expect((await me.GET(call("me", "GET"))).status).toBe(401);
    expect((await logoutAll.POST(call("logout-all", "POST"))).status).toBe(401);
    expect(revokeAllSessions).not.toHaveBeenCalled();
  });

  it("logout-all revokes every session of the customer and clears the cookie", async () => {
    getCurrentSession.mockResolvedValue(SESSION);
    revokeAllSessions.mockResolvedValue(3);
    const res = await logoutAll.POST(call("logout-all", "POST"));
    expect(res.status).toBe(200);
    expect(revokeAllSessions).toHaveBeenCalledWith("c1");
    expect(clearSessionCookie).toHaveBeenCalled();
  });

  it("GET me returns only whitelisted fields (never hashes, tokens or internal ids)", async () => {
    getCurrentSession.mockResolvedValue(SESSION);
    // The DB layer returns extra/internal fields; the response must strip them.
    findUnique.mockResolvedValue({
      id: "c1",
      email: "jane@example.com",
      name: "Jane",
      creditsBalance: 7,
      paddleCustomerId: "ctm_secret",
      status: "ACTIVE",
      tokenHash: "deadbeef",
      sessions: [{ tokenHash: "deadbeef" }],
      subscriptions: [
        { product: "SIGN_PRO", interval: "MONTH", status: "ACTIVE", currentPeriodEnd: new Date("2026-11-01T00:00:00Z"), paddleSubscriptionId: "sub_secret" },
      ],
    });
    const res = await me.GET(call("me", "GET"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({
      ok: true,
      customer: {
        id: "c1",
        email: "jane@example.com",
        name: "Jane",
        creditsBalance: 7,
        subscriptions: [{ product: "SIGN_PRO", interval: "MONTH", status: "ACTIVE", currentPeriodEnd: "2026-11-01T00:00:00.000Z" }],
      },
    });
    const text = JSON.stringify(body);
    for (const leaked of ["tokenHash", "codeHash", "deadbeef", "paddle", "secret", "sessions", "status\":\"ACTIVE\",\"tokenHash"]) {
      expect(text).not.toContain(leaked);
    }
  });
});
