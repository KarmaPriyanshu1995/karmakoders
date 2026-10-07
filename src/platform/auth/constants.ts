/** Shared auth constants — safe to import from client or server. */
export const KK_SESSION_COOKIE = "kk_session";

export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
export const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_LENGTH = 6;

/** Rate limits for OTP request endpoints. */
export const OTP_RATE_LIMIT_EMAIL = { limit: 5, windowMs: 10 * 60 * 1000 } as const;
export const OTP_RATE_LIMIT_IP = { limit: 20, windowMs: 10 * 60 * 1000 } as const;
