import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getCurrentSigner = vi.fn();
const requestSignerOtp = vi.fn();
const verifySignerOtp = vi.fn();
const consumePlatformRateLimit = vi.fn();

vi.mock("@/modules/sign/signing/signer-session", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/modules/sign/signing/signer-session")>();
  return {
    ...actual,
    requireSigner: async () => {
      const context = await getCurrentSigner();
      if (!context) {
        const { PlatformError } = await import("@/platform/errors");
        throw new PlatformError("unauthorized", actual.SIGNER_SESSION_EXPIRED_MESSAGE);
      }
      return context;
    },
  };
});
vi.mock("@/modules/sign/signing/signer-otp", () => ({
  requestSignerOtp: (...a: unknown[]) => requestSignerOtp(...a),
  verifySignerOtp: (...a: unknown[]) => verifySignerOtp(...a),
}));
vi.mock("@/platform/rate-limit", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/platform/rate-limit")>();
  return { ...actual, consumePlatformRateLimit: (...a: unknown[]) => consumePlatformRateLimit(...a) };
});

const request = await import("./request/route");
const verify = await import("./verify/route");

const ORIGIN = "https://www.karmakoders.com";
const CONTEXT = {
  sessionId: "sess-1",
  signer: { id: "signer-1", email: "jane@example.com" },
  document: { id: "doc-1" },
};

const post = (path: "request" | "verify", body?: unknown, origin: string | null = ORIGIN) =>
  new Request(`${ORIGIN}/api/tools/sign/signing/otp/${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": "203.0.113.7",
      ...(origin ? { origin } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

beforeEach(() => {
  vi.stubEnv("SIGN_APP_ENABLED", "true");
  vi.stubEnv("APP_URL", ORIGIN);
  getCurrentSigner.mockResolvedValue(CONTEXT);
  consumePlatformRateLimit.mockResolvedValue({ allowed: true, remaining: 1, retryAfterSec: 1 });
  requestSignerOtp.mockResolvedValue({ ok: true });
  verifySignerOtp.mockResolvedValue({ verified: true, firstVerification: true });
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe("POST /api/tools/sign/signing/otp/request", () => {
  it("sends to the session signer's email; a body email is ignored", async () => {
    const res = await request.POST(post("request", { email: "attacker@evil.test" }));
    expect(res.status).toBe(200);
    expect(requestSignerOtp).toHaveBeenCalledWith(CONTEXT, { ip: "203.0.113.7", userAgent: null });
    const keys = consumePlatformRateLimit.mock.calls.map((c) => c[0]);
    expect(keys).toEqual([
      { key: "otp:signer:req:email:jane@example.com", limit: 3, windowMs: 600_000 },
      { key: "otp:signer:req:ip:203.0.113.7", limit: 10, windowMs: 3_600_000 },
    ]);
  });

  it("401 without a signer session", async () => {
    getCurrentSigner.mockResolvedValue(null);
    const res = await request.POST(post("request", {}));
    expect(res.status).toBe(401);
    expect(requestSignerOtp).not.toHaveBeenCalled();
  });

  it("403 on a foreign or missing Origin", async () => {
    expect((await request.POST(post("request", {}, "https://evil.test"))).status).toBe(403);
    expect((await request.POST(post("request", {}, null))).status).toBe(403);
    expect(requestSignerOtp).not.toHaveBeenCalled();
  });

  it("429 with Retry-After when a limit is hit", async () => {
    consumePlatformRateLimit.mockResolvedValueOnce({ allowed: false, remaining: 0, retryAfterSec: 120 });
    const res = await request.POST(post("request", {}));
    expect(res.status).toBe(429);
    expect(res.headers.get("retry-after")).toBe("120");
    expect(requestSignerOtp).not.toHaveBeenCalled();
  });
});

describe("POST /api/tools/sign/signing/otp/verify", () => {
  it("verifies the code for the session signer", async () => {
    const res = await verify.POST(post("verify", { code: "123456" }));
    expect(res.status).toBe(200);
    expect(verifySignerOtp).toHaveBeenCalledWith(CONTEXT, "123456", { ip: "203.0.113.7", userAgent: null });
    expect(consumePlatformRateLimit).toHaveBeenCalledWith({ key: "otp:signer:verify:ip:203.0.113.7", limit: 20, windowMs: 3_600_000 });
  });

  it("400 on a malformed code, 401 without a session, 403 cross-origin", async () => {
    expect((await verify.POST(post("verify", { code: "12ab" }))).status).toBe(400);
    expect((await verify.POST(post("verify", { code: "123456" }, "https://evil.test"))).status).toBe(403);
    getCurrentSigner.mockResolvedValue(null);
    expect((await verify.POST(post("verify", { code: "123456" }))).status).toBe(401);
    expect(verifySignerOtp).not.toHaveBeenCalled();
  });
});

describe("signer APIs are never cached", () => {
  it("Cache-Control: no-store on 200, 400, 401, 403 and 429", async () => {
    const responses = [
      await verify.POST(post("verify", { code: "123456" })),
      await verify.POST(post("verify", { code: "12ab" })),
      await request.POST(post("request", {}, "https://evil.test")),
    ];
    consumePlatformRateLimit.mockResolvedValueOnce({ allowed: false, remaining: 0, retryAfterSec: 120 });
    responses.push(await request.POST(post("request", {})));
    getCurrentSigner.mockResolvedValue(null);
    responses.push(await request.POST(post("request", {})));

    expect(responses.map((r) => r.status)).toEqual([200, 400, 403, 429, 401]);
    for (const res of responses) expect(res.headers.get("cache-control")).toBe("no-store");
  });
});

describe("signer APIs follow SIGN_APP_ENABLED", () => {
  it.each([
    ["request", () => request.POST(post("request", {}))],
    ["verify", () => verify.POST(post("verify", { code: "123456" }))],
  ])("%s → 404 when disabled", async (_name, call) => {
    vi.stubEnv("SIGN_APP_ENABLED", "false");
    const res = await call();
    expect(res.status).toBe(404);
    expect(requestSignerOtp).not.toHaveBeenCalled();
    expect(verifySignerOtp).not.toHaveBeenCalled();
  });
});
