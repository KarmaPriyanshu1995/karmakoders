import { afterEach, describe, expect, it, vi } from "vitest";
import { EARLY_ACCESS_HREF, getPlanCta, getSignPrimaryCta, getTemplateCta, requiresCustomerSession, signGatedRoute } from "@/modules/sign/launch";

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
    "/tools/sign/sign",
    "/tools/sign/s/invalid",
    "/tools/sign/s/not-yet",
    "/tools/sign/login/",
  ])("%s is a gated page", (path) => {
    expect(signGatedRoute(path)).toBe("page");
  });

  it.each(["/api/platform/auth/otp/request", "/api/platform/auth/otp/verify", "/api/platform/auth/me", "/api/platform/auth/logout", "/api/tools/sign/signing/otp/request", "/api/tools/sign/signing/otp/verify"])(
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

describe("requiresCustomerSession (proxy login redirect)", () => {
  it.each([
    "/tools/sign/dashboard",
    "/tools/sign/documents",
    "/tools/sign/documents/doc_1",
    "/tools/sign/new",
    "/tools/sign/new/mutual-nda",
    "/tools/sign/new/upload",
    "/tools/sign/billing",
    "/tools/sign/settings",
    "/tools/sign/settings/",
  ])("%s needs a session", (path) => {
    expect(requiresCustomerSession(path)).toBe(true);
    expect(signGatedRoute(path)).toBe("page");
  });

  it.each(["/tools/sign", "/tools/sign/login", "/tools/sign/templates/mutual-nda", "/tools/sign/documentsx", "/tools/sign/dev/screens"])(
    "%s does not",
    (path) => {
      expect(requiresCustomerSession(path)).toBe(false);
    }
  );
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

  it("template CTA: builder when signed in, login?next=builder when signed out, early access when off", async () => {
    const { safeNextPath } = await import("@/platform/auth/redirect");
    expect(getTemplateCta("mutual-nda", true, true)).toEqual({ label: "Get started", href: "/tools/sign/new/mutual-nda", kind: "app" });
    const signedOut = getTemplateCta("mutual-nda", true);
    expect(signedOut).toEqual({ label: "Get started", href: "/tools/sign/login?next=%2Ftools%2Fsign%2Fnew%2Fmutual-nda", kind: "app" });
    // After login, the next path is allowed and lands on the builder.
    const next = new URL(signedOut.href, "https://kk.invalid").searchParams.get("next");
    expect(safeNextPath(next)).toBe("/tools/sign/new/mutual-nda");
    expect(getTemplateCta("mutual-nda", false)).toEqual(getSignPrimaryCta(false));
    expect(getTemplateCta("mutual-nda", false, true)).toEqual(getSignPrimaryCta(false));
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
