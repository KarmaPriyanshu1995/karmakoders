import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";
import { PlatformError } from "@/platform/errors";
import { rateLimitedResponse } from "@/platform/rate-limit";
import { signApiRoute, withNoStore } from "@/modules/sign/launch/route";

const ORIGIN = "https://www.karmakoders.com";

const get = () => new Request(`${ORIGIN}/api/platform/auth/me`);

describe("signApiRoute: Cache-Control no-store on every response", () => {
  beforeEach(() => {
    vi.stubEnv("SIGN_APP_ENABLED", "true");
    vi.stubEnv("APP_URL", ORIGIN);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it.each([
    ["200 success", async () => NextResponse.json({ ok: true }), 200],
    ["400 bad request", async () => { throw new PlatformError("bad_request", "Enter a valid email address"); }, 400],
    ["401 unauthorized", async () => { throw new PlatformError("unauthorized", "Sign in required"); }, 401],
    ["429 rate limited", async () => rateLimitedResponse([{ allowed: false, remaining: 0, retryAfterSec: 30 }])!, 429],
    ["500 unexpected error", async () => { throw new Error("boom"); }, 500],
  ] as const)("%s", async (_name, handler, status) => {
    const res = await signApiRoute(handler)(get());
    expect(res.status).toBe(status);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
  });

  it("404 from the launch switch", async () => {
    vi.stubEnv("SIGN_APP_ENABLED", "false");
    const res = await signApiRoute(async () => NextResponse.json({ ok: true }))(get());
    expect(res.status).toBe(404);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
  });

  it("403 from the origin check", async () => {
    const req = new Request(`${ORIGIN}/api/platform/auth/logout`, { method: "POST", headers: { origin: "https://evil.example" } });
    const res = await signApiRoute(async () => NextResponse.json({ ok: true }))(req);
    expect(res.status).toBe(403);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
  });

  it("keeps the handler's other headers (Retry-After)", async () => {
    const res = await signApiRoute(async () => rateLimitedResponse([{ allowed: false, remaining: 0, retryAfterSec: 30 }])!)(get());
    expect(res.headers.get("Retry-After")).toBe("30");
  });
});

describe("withNoStore", () => {
  it("copies a response whose headers are immutable", async () => {
    const original = Response.redirect(`${ORIGIN}/tools/sign`, 303);
    const res = withNoStore(original);
    expect(res.status).toBe(303);
    expect(res.headers.get("Location")).toBe(`${ORIGIN}/tools/sign`);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
  });
});
