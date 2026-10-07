import "server-only";

import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { getAuthEnv } from "@/platform/env/server";
import { OTP_LENGTH } from "./constants";

function parseSecretMaterial(value: string): Buffer {
  if (value.startsWith("base64:")) {
    return Buffer.from(value.slice("base64:".length), "base64");
  }
  return Buffer.from(value, "utf8");
}

function hmacHex(secret: Buffer, payload: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

/** HMAC-SHA256 hex digest of a session cookie value (store this, never the raw cookie). */
export function hashSessionToken(rawToken: string): string {
  const { SESSION_SECRET } = getAuthEnv();
  return hmacHex(parseSecretMaterial(SESSION_SECRET), `session:${rawToken}`);
}

/** HMAC-SHA256 of OTP code bound to email + purpose. */
export function hashOtpCode(input: {
  email: string;
  purpose: string;
  code: string;
}): string {
  const { SESSION_SECRET } = getAuthEnv();
  const normalizedEmail = input.email.trim().toLowerCase();
  return hmacHex(
    parseSecretMaterial(SESSION_SECRET),
    `otp:${normalizedEmail}:${input.purpose}:${input.code}`
  );
}

/** HMAC-SHA256 of a raw signer URL token using TOKEN_PEPPER. */
export function hashSignerToken(rawToken: string): string {
  const { TOKEN_PEPPER } = getAuthEnv();
  return hmacHex(parseSecretMaterial(TOKEN_PEPPER), `signer:${rawToken}`);
}

export function generateSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

export function generateSignerToken(): string {
  return randomBytes(32).toString("base64url");
}

/** Cryptographically random 6-digit numeric OTP (000000–999999). */
export function generateOtpCode(length = OTP_LENGTH): string {
  const max = 10 ** length;
  const n = randomBytes(4).readUInt32BE(0) % max;
  return String(n).padStart(length, "0");
}

const HEX_RE = /^[a-f0-9]+$/i;

/** Constant-time comparison of two hex digests (crypto.timingSafeEqual on decoded bytes). */
export function safeEqualHex(a: string, b: string): boolean {
  if (!HEX_RE.test(a) || !HEX_RE.test(b) || a.length % 2 !== 0 || a.length !== b.length) {
    return false;
  }
  return timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
}
