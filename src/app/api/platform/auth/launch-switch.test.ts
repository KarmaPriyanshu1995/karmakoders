import { afterEach, describe, expect, it, vi } from "vitest";

const verifyCustomerOtp = vi.fn();
const getCustomerSession = vi.fn();
const revokeCustomerSession = vi.fn();
vi.mock("@/platform/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/platform/auth")>();
  return {
    ...actual,
    verifyCustomerOtp: (...a: unknown[]) => verifyCustomerOtp(...a),
    getCustomerSession: () => getCustomerSession(),
    revokeCustomerSession: () => revokeCustomerSession(),
  };
});
vi.mock("@/platform/db", () => ({ prisma: {}, withDbRetry: vi.fn() }));
vi.mock("@/platform/rate-limit", () => ({
  consumePlatformRateLimit: vi.fn(async () => ({ allowed: true, remaining: 1, retryAfterSec: 1 })),
  clientIpFromRequest: () => "203.0.113.7",
}));

const verify = await import("@/app/api/platform/auth/otp/verify/route");
const me = await import("@/app/api/platform/auth/me/route");
const logout = await import("@/app/api/platform/auth/logout/route");

const verifyReq = () =>
  new Request("http://localhost/api/platform/auth/otp/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "jane@example.com", code: "123456" }),
  });

afterEach(() => {
  vi.unstubAllEnvs();
  verifyCustomerOtp.mockReset();
  getCustomerSession.mockReset();
  revokeCustomerSession.mockReset();
});

describe("auth API routes honour SIGN_APP_ENABLED", () => {
  it("all return 404 JSON and do nothing when disabled", async () => {
    vi.stubEnv("SIGN_APP_ENABLED", "false");
    for (const res of [await verify.POST(verifyReq()), await me.GET(), await logout.POST()]) {
      expect(res.status).toBe(404);
      expect(await res.json()).toEqual({ error: "Not found", code: "not_found" });
    }
    expect(verifyCustomerOtp).not.toHaveBeenCalled();
    expect(getCustomerSession).not.toHaveBeenCalled();
    expect(revokeCustomerSession).not.toHaveBeenCalled();
  });

  it("work normally when enabled", async () => {
    vi.stubEnv("SIGN_APP_ENABLED", "true");
    verifyCustomerOtp.mockResolvedValue({ customer: { id: "c1", email: "jane@example.com", name: null } });
    getCustomerSession.mockResolvedValue(null);
    revokeCustomerSession.mockResolvedValue(undefined);

    expect((await verify.POST(verifyReq())).status).toBe(200);
    expect((await me.GET()).status).toBe(401);
    expect((await logout.POST()).status).toBe(200);
  });
});
