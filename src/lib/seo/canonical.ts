/** Production origin used in every canonical URL, whatever host served the request. */
export const CANONICAL_ORIGIN = "https://www.karmakoders.com";

/**
 * Absolute canonical URL for a site path: no query string, no trailing slash ("/" → the bare
 * origin). Pages set it through `alternates.canonical`, the only source of canonical tags.
 */
export function canonicalUrl(path: string): string {
  const pathname = path.split(/[?#]/)[0] || "/";
  const clean = pathname === "/" ? "" : pathname.replace(/\/+$/, "");
  return `${CANONICAL_ORIGIN}${clean}`;
}
