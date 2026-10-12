import "server-only";

/**
 * Passwordless email OTP for product customers (`kk_session`, `__Host-kk_session` in production).
 * Never uses NextAuth `getServerSession` for customers. See docs/AUTH.md.
 */

export {
  KK_SESSION_COOKIE_BASE,
  sessionCookieName,
  SESSION_TTL_MS,
  SESSION_ABSOLUTE_MAX_MS,
  SESSION_REFRESH_INTERVAL_MS,
  OTP_TTL_MS,
  OTP_MAX_ATTEMPTS,
  OTP_LENGTH,
  OTP_REQUEST_LIMIT_EMAIL,
  OTP_REQUEST_LIMIT_IP,
  OTP_VERIFY_LIMIT_IP,
  SIGN_LOGIN_PATH,
  SIGN_DEFAULT_AFTER_LOGIN,
} from "./constants";

export {
  hashSessionToken,
  hashOtpCode,
  hashSignerToken,
  generateSessionToken,
  generateSignerToken,
  generateOtpCode,
  safeEqualHex,
} from "./crypto";

export {
  createCustomerSession,
  setSessionCookie,
  clearSessionCookie,
  getCurrentSession,
  getCurrentCustomer,
  requireCustomer,
  revokeSession,
  revokeAllSessions,
  sessionCookieOptions,
  nextSessionExpiry,
  shouldRefreshSession,
  type CurrentCustomer,
  type CustomerSession,
} from "./session";

export { safeNextPath, buildLoginHref } from "./redirect";

export { getCustomerProfile, customerProfileSchema, ACTIVE_SUBSCRIPTION_STATUSES, type CustomerProfile } from "./profile";

export { requestCustomerOtp, verifyCustomerOtp, OTP_INVALID_MESSAGE } from "./otp";

export {
  emailSchema,
  otpCodeSchema,
  otpRequestBodySchema,
  otpVerifyBodySchema,
  type OtpRequestBody,
  type OtpVerifyBody,
} from "./schemas";

export { parseJsonBody } from "./http";
