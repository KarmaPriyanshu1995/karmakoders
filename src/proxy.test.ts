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
];
const PUBLIC_PAGES = ["/tools/sign", "/tools/sign/templates", "/tools/sign/templates/mutual-nda"];

describe("proxy: Sign launch switch", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    getToken.mockReset();
  });

  it("matches Sign and platform API paths", () => {
    expect(config.matcher).toEqual(expect.arrayContaining(["/tools/sign/:path*", "/api/platform/:path*"]));
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
    it.each([...GATED_PAGES, ...PUBLIC_PAGES, "/api/platform/auth/me"])("%s passes through", async (path) => {
      vi.stubEnv("SIGN_APP_ENABLED", "true");
      const res = await proxy(req(path));
      expect(res.status).toBe(200);
      expect(res.headers.get("x-middleware-next")).toBe("1");
    });
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
