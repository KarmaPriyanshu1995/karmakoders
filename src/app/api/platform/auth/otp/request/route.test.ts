import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const requestCustomerOtp = vi.fn();
vi.mock("@/platform/auth/otp", () => ({
  requestCustomerOtp: (...a: unknown[]) => requestCustomerOtp(...a),
  verifyCustomerOtp: vi.fn(),
  OTP_INVALID_MESSAGE: "x",
}));

vi.mock("@/platform/db", () => ({ prisma: {}, withDbRetry: vi.fn() }));

const consumePlatformRateLimit = vi.fn();
vi.mock("@/platform/rate-limit", () => ({
  consumePlatformRateLimit: (...a: unknown[]) => consumePlatformRateLimit(...a),
  clientIpFromRequest: () => "203.0.113.7",
}));

const { POST } = await import("@/app/api/platform/auth/otp/request/route");

function post(body: unknown, raw = false) {
  return new Request("http://localhost/api/platform/auth/otp/request", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: raw ? String(body) : JSON.stringify(body),
  });
}

const ALLOW = { allowed: true, remaining: 4, retryAfterSec: 600 };

describe("POST /api/platform/auth/otp/request", () => {
  beforeEach(() => {
    vi.stubEnv("SIGN_APP_ENABLED", "true");
    requestCustomerOtp.mockReset().mockResolvedValue({ ok: true });
    consumePlatformRateLimit.mockReset().mockResolvedValue(ALLOW);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("returns 404 JSON and does nothing while SIGN_APP_ENABLED=false", async () => {
    vi.stubEnv("SIGN_APP_ENABLED", "false");
    const res = await POST(post({ email: "jane@example.com" }));
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "Not found", code: "not_found" });
    expect(requestCustomerOtp).not.toHaveBeenCalled();
    expect(consumePlatformRateLimit).not.toHaveBeenCalled();
  });

  it("valid email → 200 and requests a code for the normalized address", async () => {
    const res = await POST(post({ email: "  Jane@Example.com " }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(requestCustomerOtp).toHaveBeenCalledWith({
      email: "jane@example.com",
      purpose: "LOGIN",
      ip: "203.0.113.7",
    });
    expect(consumePlatformRateLimit.mock.calls.map((c) => c[0].key)).toEqual([
      "otp:req:email:jane@example.com",
      "otp:req:ip:203.0.113.7",
    ]);
  });

  it("invalid email → 400 with a safe message that does not echo input", async () => {
    const res = await POST(post({ email: "<script>@nope" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toEqual({ error: "Enter a valid email address", code: "bad_request" });
    expect(requestCustomerOtp).not.toHaveBeenCalled();
    expect(consumePlatformRateLimit).not.toHaveBeenCalled();
  });

  it("malformed JSON → 400", async () => {
    const res = await POST(post("{not json", true));
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe("bad_request");
  });

  it("rate-limited → 429 with Retry-After and no code sent", async () => {
    consumePlatformRateLimit
      .mockResolvedValueOnce({ allowed: false, remaining: 0, retryAfterSec: 120 })
      .mockResolvedValueOnce(ALLOW);
    const res = await POST(post({ email: "jane@example.com" }));
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("600");
    expect((await res.json()).code).toBe("rate_limited");
    expect(requestCustomerOtp).not.toHaveBeenCalled();
  });

  it("unexpected errors → generic 500", async () => {
    requestCustomerOtp.mockRejectedValue(new Error("db exploded with secret detail"));
    const res = await POST(post({ email: "jane@example.com" }));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "Internal server error", code: "internal" });
  });
});
