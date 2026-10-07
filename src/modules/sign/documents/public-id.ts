import "server-only";

import { randomInt } from "crypto";

/**
 * Unambiguous alphabet for human-read IDs: no 0/O, 1/I/L. 31 symbols → 31^6 ≈ 887M
 * combinations per year. Uniqueness is still enforced by the DB (sign_documents.public_id).
 */
export const PUBLIC_ID_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

const SUFFIX_LENGTH = 6;
const PUBLIC_ID_RE = new RegExp(`^KKS-\\d{4}-[${PUBLIC_ID_ALPHABET}]{${SUFFIX_LENGTH}}$`);

/** `KKS-YYYY-XXXXXX` (UTC year), cryptographically random suffix. Retry on unique conflict. */
export function generatePublicId(date: Date = new Date()): string {
  let suffix = "";
  for (let i = 0; i < SUFFIX_LENGTH; i++) {
    suffix += PUBLIC_ID_ALPHABET[randomInt(PUBLIC_ID_ALPHABET.length)];
  }
  return `KKS-${date.getUTCFullYear()}-${suffix}`;
}

/** Validates format only (case-sensitive) — use before any DB lookup on the public verify page. */
export function isValidPublicId(value: string): boolean {
  return PUBLIC_ID_RE.test(value);
}
