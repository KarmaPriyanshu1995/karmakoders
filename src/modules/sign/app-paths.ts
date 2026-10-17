/**
 * Logged-in Sign app routes (the (workspace) route group) plus the dev-only preview. Client-safe.
 * Site-wide marketing widgets (Book a call, WhatsApp) are hidden here; signer pages are already
 * hidden as sensitive paths. The login page and marketing pages are deliberately not listed.
 */
export const SIGN_APP_PATH_PREFIXES = [
  "/tools/sign/dashboard",
  "/tools/sign/new",
  "/tools/sign/documents",
  "/tools/sign/billing",
  "/tools/sign/settings",
  "/tools/sign/dev",
] as const;

export function isSignAppPath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  return SIGN_APP_PATH_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}
