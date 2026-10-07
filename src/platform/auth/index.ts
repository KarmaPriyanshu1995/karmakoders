import "server-only";

/**
 * Passwordless email OTP for product customers (`kk_session`).
 * Never uses NextAuth `getServerSession` for customers.
 */

export {
  KK_SESSION_COOKIE,
  SESSION_TTL_MS,
  OTP_TTL_MS,
  OTP_MAX_ATTEMPTS,
  OTP_LENGTH,
  OTP_RATE_LIMIT_EMAIL,
  OTP_RATE_LIMIT_IP,
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
  getCustomerSession,
  requireCustomerSession,
  revokeCustomerSession,
  sessionCookieOptions,
  type CustomerSession,
} from "./session";

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
