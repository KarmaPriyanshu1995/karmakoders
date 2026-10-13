/** Signer access constants — client-safe (no server imports). See docs/AUTH.md "Signer access". */

/** Base cookie name. Production uses the `__Host-` prefix (see signerCookieName). */
export const KK_SIGNER_COOKIE_BASE = "kk_signer";

/** `__Host-kk_signer` in production (Secure, Path=/, no Domain enforced by the browser), `kk_signer` elsewhere. */
export function signerCookieName(env: { NODE_ENV?: string } = process.env): string {
  return env.NODE_ENV === "production" ? `__Host-${KK_SIGNER_COOKIE_BASE}` : KK_SIGNER_COOKIE_BASE;
}

/** Fixed signer session lifetime (no sliding refresh). */
export const SIGNER_SESSION_TTL_MS = 2 * 60 * 60 * 1000;

/** Link token: 32 random bytes as base64url = exactly 43 characters of [A-Za-z0-9_-]. */
export const SIGNER_TOKEN_RE = /^[A-Za-z0-9_-]{43}$/;

/** The one message shown for every invalid link (never says why). */
export const SIGNER_LINK_INVALID_MESSAGE = "This link is invalid or has expired";

/** Token exchange: 60 resolutions per minute per IP. */
export const SIGNER_LINK_LIMIT_IP = { limit: 60, windowMs: 60 * 1000 } as const;

export const SIGNER_HOME_PATH = "/tools/sign/sign";
export const SIGNER_LINK_INVALID_PATH = "/tools/sign/s/invalid";
export const SIGNER_NOT_YET_PATH = "/tools/sign/s/not-yet";

/** Response headers for the token route and every signer page. */
export const SIGNER_RESPONSE_HEADERS = {
  "X-Robots-Tag": "noindex, nofollow",
  "Referrer-Policy": "no-referrer",
  "Cache-Control": "no-store",
} as const;
