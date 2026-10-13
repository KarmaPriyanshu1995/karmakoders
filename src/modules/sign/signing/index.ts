/**
 * Signer access: link tokens, signer sessions (kk_signer) and signer OTP. See docs/AUTH.md.
 * Client components import ./constants directly (the other modules are server-only).
 */
export * from "./constants";
export {
  createSignerToken,
  resolveSignerToken,
  evaluateSignerAccess,
  isWellFormedSignerToken,
  type SignerTokenResult,
  type SignerAccessRow,
  type DocumentAccessRow,
} from "./signer-access";
export {
  getCurrentSigner,
  requireSigner,
  startSignerSession,
  createSignerSession,
  loadSignerSession,
  signerCookieOptions,
  SIGNER_SESSION_EXPIRED_MESSAGE,
  type SignerContext,
} from "./signer-session";
export { requestSignerOtp, verifySignerOtp } from "./signer-otp";
