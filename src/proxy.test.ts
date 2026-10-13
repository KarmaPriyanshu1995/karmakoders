import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const getToken = vi.fn();
vi.mock("next-auth/jwt", () => ({ getToken: (...a: unknown[]) => getToken(...a) }));

const { proxy, config } = await import("@/proxy");

const req = (path: string) => new NextRequest(`https://www.karmakoders.com${path}`);

const GATED_PAGES = [
  "/tools/sign/login",
  "/tools/sign/dashboard",
  "/tools/sign/new/mutual-nda",
  "/tools/sign/documents/abc",
  "/tools/sign/billing",
  "/tools/sign/settings",
  "/tools/sign/s/token123",
  "/tools/sign/sign/token123",
  "/tools/sign/s/invalid",
  "/tools/sign/s/not-yet",
  "/tools/sign/sign",
];
const PUBLIC_PAGES = ["/tools/sign", "/tools/sign/templates", "/tools/sign/templates/mutual-nda"];

describe("proxy: Sign launch switch", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    getToken.mockReset();
  });

  it("matches Sign and platform API paths", () => {
    expect(config.matcher).toEqual(expect.arrayContaining(["/tools/sign/:path*", "/api/platform/:path*", "/api/tools/sign/:path*"]));
  });

  describe("SIGN_APP_ENABLED=false (default)", () => {
    it.each(GATED_PAGES)("%s → 404", async (path) => {
      vi.stubEnv("SIGN_APP_ENABLED", "false");
      const res = await proxy(req(path));
      expect(res.status).toBe(404);
      expect(res.headers.get("x-robots-tag")).toContain("noindex");
    });

    it("unset behaves like false", async () => {
      vi.stubEnv("SIGN_APP_ENABLED", "");
      expect((await proxy(req("/tools/sign/login"))).status).toBe(404);
    });

    it.each(["/api/tools/sign/signing/otp/request", "/api/tools/sign/signing/otp/verify"])("%s → 404 JSON", async (path) => {
      vi.stubEnv("SIGN_APP_ENABLED", "false");
      const res = await proxy(req(path));
      expect(res.status).toBe(404);
      expect(await res.json()).toEqual({ error: "Not found", code: "not_found" });
    });

    it("/api/platform/auth/* → 404 JSON", async () => {
      vi.stubEnv("SIGN_APP_ENABLED", "false");
      const res = await proxy(req("/api/platform/auth/otp/request"));
      expect(res.status).toBe(404);
      expect(await res.json()).toEqual({ error: "Not found", code: "not_found" });
    });

    it.each(PUBLIC_PAGES)("%s passes through", async (path) => {
      vi.stubEnv("SIGN_APP_ENABLED", "false");
      const res = await proxy(req(path));
      expect(res.status).toBe(200);
      expect(res.headers.get("x-middleware-next")).toBe("1");
    });
  });

  describe("SIGN_APP_ENABLED=true", () => {
    const PROTECTED = [
      "/tools/sign/dashboard",
      "/tools/sign/new/mutual-nda",
      "/tools/sign/documents/abc",
      "/tools/sign/billing",
      "/tools/sign/settings",
    ];

    it.each(PROTECTED)("%s without a session cookie → 307 to login with next", async (path) => {
      vi.stubEnv("SIGN_APP_ENABLED", "true");
      const res = await proxy(req(`${path}?tab=1`));
      expect(res.status).toBe(307);
      const location = new URL(res.headers.get("location")!);
      expect(location.pathname).toBe("/tools/sign/login");
      expect(location.searchParams.get("next")).toBe(`${path}?tab=1`);
    });

    it.each(PROTECTED)("%s with a session cookie passes through (pages still call requireCustomer)", async (path) => {
      vi.stubEnv("SIGN_APP_ENABLED", "true");
      const withCookie = new NextRequest(`https://www.karmakoders.com${path}`, { headers: { cookie: "kk_session=abc" } });
      const res = await proxy(withCookie);
      expect(res.status).toBe(200);
      expect(res.headers.get("x-middleware-next")).toBe("1");
    });

    it("checks the __Host- cookie name in production", async () => {
      vi.stubEnv("SIGN_APP_ENABLED", "true");
      vi.stubEnv("NODE_ENV", "production");
      const plain = new NextRequest("https://www.karmakoders.com/tools/sign/dashboard", { headers: { cookie: "kk_session=abc" } });
      expect((await proxy(plain)).status).toBe(307);
      const host = new NextRequest("https://www.karmakoders.com/tools/sign/dashboard", { headers: { cookie: "__Host-kk_session=abc" } });
      expect((await proxy(host)).status).toBe(200);
    });

    it.each(["/tools/sign/login", "/tools/sign/s/token123", "/tools/sign/sign/token123", ...PUBLIC_PAGES, "/api/platform/auth/me"])(
      "%s passes through without a cookie",
      async (path) => {
        vi.stubEnv("SIGN_APP_ENABLED", "true");
        const res = await proxy(req(path));
        expect(res.status).toBe(200);
        expect(res.headers.get("x-middleware-next")).toBe("1");
      }
    );
  });

  it("never consults NextAuth for Sign paths, and still guards /admin", async () => {
    vi.stubEnv("SIGN_APP_ENABLED", "true");
    await proxy(req("/tools/sign/dashboard"));
    expect(getToken).not.toHaveBeenCalled();

    getToken.mockResolvedValue(null);
    const res = await proxy(req("/admin/pages"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/admin/login");
  });
});
