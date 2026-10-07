import { afterEach, describe, expect, it, vi } from "vitest";
import { EARLY_ACCESS_HREF, getPlanCta, getSignPrimaryCta, signGatedRoute } from "@/modules/sign/launch";

const notFound = vi.fn(() => {
  throw new Error("NEXT_NOT_FOUND");
});
vi.mock("next/navigation", () => ({ notFound: () => notFound() }));

describe("signGatedRoute", () => {
  it.each([
    "/tools/sign/login",
    "/tools/sign/dashboard",
    "/tools/sign/new/mutual-nda",
    "/tools/sign/new/upload",
    "/tools/sign/documents/abc",
    "/tools/sign/billing",
    "/tools/sign/settings",
    "/tools/sign/s/token123",
    "/tools/sign/sign/token123",
    "/tools/sign/login/",
  ])("%s is a gated page", (path) => {
    expect(signGatedRoute(path)).toBe("page");
  });

  it.each(["/api/platform/auth/otp/request", "/api/platform/auth/otp/verify", "/api/platform/auth/me", "/api/platform/auth/logout"])(
    "%s is a gated API",
    (path) => {
      expect(signGatedRoute(path)).toBe("api");
    }
  );

  it.each([
    "/tools/sign",
    "/tools/sign/",
    "/tools/sign/templates",
    "/tools/sign/templates/mutual-nda",
    "/tools/sign/pricing",
    "/tools/sign/contact",
    "/tools/sign/loginx",
    "/tools/sign/session",
    "/tools/signature",
    "/api/platform/other",
  ])("%s stays public", (path) => {
    expect(signGatedRoute(path)).toBeNull();
  });
});

describe("launch-aware CTAs", () => {
  it('say "Get started" → login when the app is enabled', () => {
    expect(getSignPrimaryCta(true)).toEqual({ label: "Get started", href: "/tools/sign/login", kind: "app" });
    expect(getPlanCta("sign_pro_monthly", true)).toEqual({
      kind: "signup",
      label: "Get started",
      href: "/tools/sign/login",
      planId: "sign_pro_monthly",
    });
  });

  it("point to the early-access form when the app is disabled", () => {
    expect(getSignPrimaryCta(false)).toEqual({ label: "Get early access", href: EARLY_ACCESS_HREF, kind: "early-access" });
    for (const planId of ["free", "credits_10", "credits_30", "sign_pro_yearly", "all_access_monthly"] as const) {
      expect(getPlanCta(planId, false)).toEqual({ kind: "early-access", label: "Get early access", href: EARLY_ACCESS_HREF });
    }
    expect(EARLY_ACCESS_HREF).toBe("/tools/sign#early-access");
  });

  it("never link a disabled CTA to a gated route", () => {
    for (const cta of [getSignPrimaryCta(false), getPlanCta("free", false)]) {
      expect(signGatedRoute(cta.href.split("#")[0])).toBeNull();
    }
  });
});

describe("server guards", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    notFound.mockClear();
  });

  it("requireSignAppEnabledPage calls notFound() when disabled, nothing when enabled", async () => {
    const { requireSignAppEnabledPage } = await import("@/modules/sign/launch/server");
    vi.stubEnv("SIGN_APP_ENABLED", "false");
    expect(() => requireSignAppEnabledPage()).toThrow("NEXT_NOT_FOUND");
    vi.stubEnv("SIGN_APP_ENABLED", "true");
    expect(() => requireSignAppEnabledPage()).not.toThrow();
  });

  it("requireSignAppEnabledApi throws a 404 PlatformError when disabled", async () => {
    const { requireSignAppEnabledApi } = await import("@/modules/sign/launch/server");
    vi.stubEnv("SIGN_APP_ENABLED", "");
    expect(() => requireSignAppEnabledApi()).toThrow(expect.objectContaining({ status: 404, code: "not_found" }));
    vi.stubEnv("SIGN_APP_ENABLED", "true");
    expect(() => requireSignAppEnabledApi()).not.toThrow();
  });
});
