/** Shared auth constants — safe to import from client, server and src/proxy.ts. */

/** Base cookie name. Production uses the `__Host-` prefix (see sessionCookieName). */
export const KK_SESSION_COOKIE_BASE = "kk_session";

/**
 * `__Host-kk_session` in production: the browser then requires Secure, Path=/ and no Domain,
 * so a subdomain or plain-HTTP response can never set or overwrite the session cookie.
 * `kk_session` elsewhere (localhost is plain HTTP, where `__Host-` cookies are rejected).
 */
export function sessionCookieName(env: { NODE_ENV?: string } = process.env): string {
  return env.NODE_ENV === "production" ? `__Host-${KK_SESSION_COOKIE_BASE}` : KK_SESSION_COOKIE_BASE;
}

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

/** Sliding idle expiry: each refresh pushes expiresAt to now + 30 days. */
export const SESSION_TTL_MS = 30 * DAY_MS;
/** Hard cap from creation, regardless of activity. */
export const SESSION_ABSOLUTE_MAX_MS = 90 * DAY_MS;
/** Write lastSeenAt/expiresAt at most this often (avoids a DB write per request). */
export const SESSION_REFRESH_INTERVAL_MS = HOUR_MS;

export const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_LENGTH = 6;

/** POST /api/platform/auth/otp/request */
export const OTP_REQUEST_LIMIT_EMAIL = { limit: 3, windowMs: 10 * 60 * 1000 } as const;
export const OTP_REQUEST_LIMIT_IP = { limit: 10, windowMs: HOUR_MS } as const;
/** POST /api/platform/auth/otp/verify (per-code attempts are capped in the DB: OTP_MAX_ATTEMPTS). */
export const OTP_VERIFY_LIMIT_IP = { limit: 20, windowMs: HOUR_MS } as const;

/** Where the login flow lands by default, and the only prefix `next` may point into. */
export const SIGN_LOGIN_PATH = "/tools/sign/login";
export const SIGN_DEFAULT_AFTER_LOGIN = "/tools/sign/dashboard";
