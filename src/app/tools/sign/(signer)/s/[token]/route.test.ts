import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const resolveSignerToken = vi.fn();
const startSignerSession = vi.fn();
const consumePlatformRateLimit = vi.fn();

vi.mock("@/modules/sign/signing/signer-access", () => ({
  resolveSignerToken: (...a: unknown[]) => resolveSignerToken(...a),
}));
vi.mock("@/modules/sign/signing/signer-session", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/modules/sign/signing/signer-session")>();
  return { ...actual, startSignerSession: (...a: unknown[]) => startSignerSession(...a) };
});
vi.mock("@/platform/rate-limit", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/platform/rate-limit")>();
  return { ...actual, consumePlatformRateLimit: (...a: unknown[]) => consumePlatformRateLimit(...a) };
});

const { GET } = await import("./route");

const TOKEN = "Zq3vT9xY2bN8mK4pL6rS1wE5uI7oA0cD3fG6hJ9kL2n";
const SESSION_VALUE = "c".repeat(43);
const ORIGIN = "https://www.karmakoders.com";

function get(cookie?: string) {
  return GET(
    new NextRequest(`${ORIGIN}/tools/sign/s/${TOKEN}`, {
      headers: { "x-forwarded-for": "203.0.113.7", "user-agent": "Vitest UA", ...(cookie ? { cookie } : {}) },
    }),
    { params: Promise.resolve({ token: TOKEN }) }
  );
}

function expectSignerHeaders(res: Response) {
  expect(res.headers.get("x-robots-tag")).toBe("noindex, nofollow");
  expect(res.headers.get("referrer-policy")).toBe("no-referrer");
  expect(res.headers.get("cache-control")).toBe("no-store");
}

beforeEach(() => {
  vi.stubEnv("SIGN_APP_ENABLED", "true");
  vi.stubEnv("NODE_ENV", "test");
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  consumePlatformRateLimit.mockResolvedValue({ allowed: true, remaining: 59, retryAfterSec: 60 });
  resolveSignerToken.mockResolvedValue({
    ok: true,
    signer: { id: "signer-1" },
    document: { id: "doc-1" },
  });
  startSignerSession.mockResolvedValue({ rawToken: SESSION_VALUE, expiresAt: new Date() });
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe("GET /tools/sign/s/[token]", () => {
  it("valid token → signer cookie + 303 to /tools/sign/sign (no token in the URL)", async () => {
    const res = await get();
    expect(res.status).toBe(303);
    const location = res.headers.get("location")!;
    expect(new URL(location).pathname).toBe("/tools/sign/sign");
    expect(location).not.toContain(TOKEN);
    expectSignerHeaders(res);

    const cookie = res.headers.get("set-cookie")!;
    expect(cookie).toMatch(new RegExp(`^kk_signer=${SESSION_VALUE};`));
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=lax/i);
    expect(cookie).toMatch(/Path=\//);
    expect(cookie).toMatch(/Max-Age=7200/);
    expect(cookie).not.toMatch(/Domain=/i);
    expect(cookie).not.toContain(TOKEN);

    expect(resolveSignerToken).toHaveBeenCalledWith(TOKEN);
    expect(startSignerSession).toHaveBeenCalledWith({
      signerId: "signer-1",
      documentId: "doc-1",
      ip: "203.0.113.7",
      userAgent: "Vitest UA",
      previousRawToken: undefined,
    });
  });

  it("uses __Host-kk_signer with Secure in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const cookie = (await get()).headers.get("set-cookie")!;
    expect(cookie).toMatch(/^__Host-kk_signer=/);
    expect(cookie).toMatch(/Secure/i);
  });

  it("hands the browser's previous signer cookie to the session so it is replaced", async () => {
    await get(`kk_signer=${"p".repeat(43)}`);
    expect(startSignerSession.mock.calls[0][0].previousRawToken).toBe("p".repeat(43));
  });

  it("invalid → 303 to the generic invalid-link page, no cookie", async () => {
    resolveSignerToken.mockResolvedValue({ ok: false, reason: "invalid" });
    const res = await get();
    expect(res.status).toBe(303);
    expect(new URL(res.headers.get("location")!).pathname).toBe("/tools/sign/s/invalid");
    expect(res.headers.get("set-cookie")).toBeNull();
    expect(startSignerSession).not.toHaveBeenCalled();
    expectSignerHeaders(res);
  });

  it("not your turn → 303 to the not-yet page, no cookie", async () => {
    resolveSignerToken.mockResolvedValue({ ok: false, reason: "not_your_turn" });
    const res = await get();
    expect(new URL(res.headers.get("location")!).pathname).toBe("/tools/sign/s/not-yet");
    expect(res.headers.get("set-cookie")).toBeNull();
  });

  it("rate limits token resolution at 60 per minute per IP", async () => {
    consumePlatformRateLimit.mockResolvedValue({ allowed: false, remaining: 0, retryAfterSec: 42 });
    const res = await get();
    expect(res.status).toBe(429);
    expect(res.headers.get("retry-after")).toBe("42");
    expect(resolveSignerToken).not.toHaveBeenCalled();
    expectSignerHeaders(res);
    expect(consumePlatformRateLimit).toHaveBeenCalledWith({ key: "signer:link:ip:203.0.113.7", limit: 60, windowMs: 60_000 });
  });

  it("fails closed when the limiter throws (e.g. Upstash missing in production), without logging the token", async () => {
    consumePlatformRateLimit.mockRejectedValue(new Error(`config error at /tools/sign/s/${TOKEN}`));
    const res = await get();
    expect(res.status).toBe(500);
    expect(resolveSignerToken).not.toHaveBeenCalled();
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain(TOKEN);
  });

  it("404 when SIGN_APP_ENABLED is false", async () => {
    vi.stubEnv("SIGN_APP_ENABLED", "false");
    const res = await get();
    expect(res.status).toBe(404);
    expect(resolveSignerToken).not.toHaveBeenCalled();
    expectSignerHeaders(res);
  });
});
