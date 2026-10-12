import { SIGN_DEFAULT_AFTER_LOGIN, SIGN_LOGIN_PATH } from "./constants";

/** Only same-site Sign paths may be used as a post-login destination. */
const ALLOWED_PREFIX = "/tools/sign/";
const MAX_DECODE_PASSES = 3;

function decodeFully(value: string): string | null {
  let current = value;
  for (let i = 0; i < MAX_DECODE_PASSES; i++) {
    let next: string;
    try {
      next = decodeURIComponent(current);
    } catch {
      return null; // malformed escape
    }
    if (next === current) return current;
    current = next;
  }
  // Still changing after several passes: treat as hostile.
  return null;
}

/**
 * Safe `next` redirect target (open-redirect defence). Returns `next` only when, after
 * fully decoding it, it is a plain path under /tools/sign/ with no scheme, no
 * protocol-relative `//`, no backslashes and no control characters. Otherwise the dashboard.
 */
export function safeNextPath(next: string | null | undefined): string {
  if (typeof next !== "string" || next.length === 0 || next.length > 2048) return SIGN_DEFAULT_AFTER_LOGIN;

  const decoded = decodeFully(next.trim());
  if (decoded === null) return SIGN_DEFAULT_AFTER_LOGIN;

  for (const candidate of [next, decoded]) {
    if (/[\u0000-\u001f\u007f\\]/.test(candidate)) return SIGN_DEFAULT_AFTER_LOGIN;
    if (candidate.startsWith("//")) return SIGN_DEFAULT_AFTER_LOGIN;
    if (/^[a-z][a-z0-9+.-]*:/i.test(candidate)) return SIGN_DEFAULT_AFTER_LOGIN;
    if (!candidate.startsWith(ALLOWED_PREFIX)) return SIGN_DEFAULT_AFTER_LOGIN;
  }

  // Normalise through URL parsing against a dummy origin: the path must stay same-origin and
  // under the prefix after dot-segment resolution (e.g. /tools/sign/../../admin is rejected).
  const resolved = new URL(decoded, "https://kk.invalid");
  if (resolved.origin !== "https://kk.invalid" || !resolved.pathname.startsWith(ALLOWED_PREFIX)) {
    return SIGN_DEFAULT_AFTER_LOGIN;
  }
  if (resolved.pathname === SIGN_LOGIN_PATH || resolved.pathname.startsWith(`${SIGN_LOGIN_PATH}/`)) {
    return SIGN_DEFAULT_AFTER_LOGIN; // never loop back to the login page
  }
  return `${resolved.pathname}${resolved.search}${resolved.hash}`;
}

/** `/tools/sign/login?next=<path>` for a protected path. */
export function buildLoginHref(fromPath: string): string {
  const next = safeNextPath(fromPath);
  return `${SIGN_LOGIN_PATH}?next=${encodeURIComponent(next)}`;
}
