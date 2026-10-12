import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const verifyCustomerOtp = vi.fn();
vi.mock("@/platform/auth/otp", () => ({
  requestCustomerOtp: vi.fn(),
  verifyCustomerOtp: (...a: unknown[]) => verifyCustomerOtp(...a),
  OTP_INVALID_MESSAGE: "x",
}));
vi.mock("@/platform/db", () => ({ prisma: {}, withDbRetry: vi.fn() }));

const consumePlatformRateLimit = vi.fn();
vi.mock("@/platform/rate-limit", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/platform/rate-limit")>()),
  consumePlatformRateLimit: (...a: unknown[]) => consumePlatformRateLimit(...a),
  clientIpFromRequest: () => "203.0.113.7",
}));

const { POST } = await import("@/app/api/platform/auth/otp/verify/route");

const post = (body: unknown) =>
  new Request("https://www.karmakoders.com/api/platform/auth/otp/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json", origin: "https://www.karmakoders.com", "user-agent": "Vitest" },
    body: JSON.stringify(body),
  });

describe("POST /api/platform/auth/otp/verify", () => {
  beforeEach(() => {
    vi.stubEnv("SIGN_APP_ENABLED", "true");
    vi.stubEnv("APP_URL", "https://www.karmakoders.com");
    verifyCustomerOtp.mockReset().mockResolvedValue({ customer: { id: "c1", email: "jane@example.com", name: null } });
    consumePlatformRateLimit.mockReset().mockResolvedValue({ allowed: true, remaining: 19, retryAfterSec: 3600 });
  });
  afterEach(() => vi.unstubAllEnvs());

  it("limits 20 per hour per IP only (per-code attempts are enforced in the DB)", async () => {
    await POST(post({ email: "jane@example.com", code: "123456" }));
    expect(consumePlatformRateLimit.mock.calls.map((c) => [c[0].key, c[0].limit, c[0].windowMs])).toEqual([
      ["otp:verify:ip:203.0.113.7", 20, 60 * 60 * 1000],
    ]);
  });

  it("rate-limited → 429 with Retry-After and a friendly message; code not checked", async () => {
    consumePlatformRateLimit.mockResolvedValue({ allowed: false, remaining: 0, retryAfterSec: 1800 });
    const res = await POST(post({ email: "jane@example.com", code: "123456" }));
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("1800");
    const body = await res.json();
    expect(body.code).toBe("rate_limited");
    expect(body.error).toMatch(/try again/i);
    expect(verifyCustomerOtp).not.toHaveBeenCalled();
  });

  it("passes client ip and user agent to the new session", async () => {
    await POST(post({ email: "jane@example.com", code: "123456" }));
    expect(verifyCustomerOtp).toHaveBeenCalledWith(
      expect.objectContaining({ client: { ip: "203.0.113.7", userAgent: "Vitest" }, purpose: "LOGIN" })
    );
  });
});
