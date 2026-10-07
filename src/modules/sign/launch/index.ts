import type { PlanId } from "@/platform/billing/plans";

/**
 * Sign launch switch (SIGN_APP_ENABLED). Pure helpers shared by src/proxy.ts, pages,
 * API routes and tests. The flag is enforced on the server — hiding links is only UX.
 */

/** App routes that return 404 while the Sign app is disabled. */
export const SIGN_APP_PAGE_PREFIXES = [
  "/tools/sign/login",
  "/tools/sign/dashboard",
  "/tools/sign/new",
  "/tools/sign/documents",
  "/tools/sign/billing",
  "/tools/sign/settings",
  // Signer links
  "/tools/sign/s",
  "/tools/sign/sign",
] as const;

export const SIGN_APP_API_PREFIXES = ["/api/platform/auth"] as const;

function matchesPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export type SignGatedRoute = "page" | "api" | null;

/** Classifies a pathname as a gated Sign page, a gated API route, or not gated. */
export function signGatedRoute(pathname: string): SignGatedRoute {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  if (SIGN_APP_API_PREFIXES.some((p) => matchesPrefix(path, p))) return "api";
  if (SIGN_APP_PAGE_PREFIXES.some((p) => matchesPrefix(path, p))) return "page";
  return null;
}

export const EARLY_ACCESS_ANCHOR = "early-access";
export const EARLY_ACCESS_HREF = `/tools/sign#${EARLY_ACCESS_ANCHOR}`;

export type SignCta = { label: string; href: string; kind: "app" | "early-access" };

/** Primary call to action: "Get started" → login when live, early access otherwise. */
export function getSignPrimaryCta(appEnabled: boolean): SignCta {
  return appEnabled
    ? { label: "Get started", href: "/tools/sign/login", kind: "app" }
    : { label: "Get early access", href: EARLY_ACCESS_HREF, kind: "early-access" };
}

/**
 * Pricing-card action. `kind` is the seam for billing: today "early-access" or "signup"
 * (→ login); a later step adds `{ kind: "checkout", planId }` and only PlanCta changes.
 */
export type PlanCtaAction =
  | { kind: "early-access"; label: string; href: string }
  | { kind: "signup"; label: string; href: string; planId: PlanId };

export function getPlanCta(planId: PlanId, appEnabled: boolean): PlanCtaAction {
  return appEnabled
    ? { kind: "signup", label: "Get started", href: "/tools/sign/login", planId }
    : { kind: "early-access", label: "Get early access", href: EARLY_ACCESS_HREF };
}
