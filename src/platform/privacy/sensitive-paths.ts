/**
 * Paths whose URL carries a bearer secret (signer link tokens).
 * Client-safe: used by site-wide components to skip canonical tags, analytics and
 * marketing widgets so the token never leaves the browser via third parties.
 */
export const SENSITIVE_PATH_PREFIXES = ["/tools/sign/s/"] as const;

export function isSensitivePath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  return SENSITIVE_PATH_PREFIXES.some(
    (prefix) => pathname.startsWith(prefix) || pathname === prefix.slice(0, -1)
  );
}

/** Robots policy for token-bearing pages. */
export const SENSITIVE_PAGE_ROBOTS = {
  index: false,
  follow: false,
  nocache: true,
  googleBot: { index: false, follow: false },
} as const;
