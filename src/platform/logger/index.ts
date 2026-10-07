/**
 * Structured logging for platform and Sign services.
 * Never pass raw OTP codes, tokens, secrets or document contents; fields with sensitive
 * names are dropped defensively. Emails must be passed through `maskEmail`.
 */

export type LogLevel = "info" | "warn" | "error";

export type LogFields = Record<string, string | number | boolean | null | undefined>;

const SENSITIVE_FIELD = /code|token|otp|secret|password|pepper|html|body|key/i;

/** `john@example.com` → `j***@example.com`. Invalid input → `***`. */
export function maskEmail(email: string | null | undefined): string {
  if (!email) return "***";
  const at = email.lastIndexOf("@");
  if (at < 1) return "***";
  return `${email[0]}***${email.slice(at)}`;
}

/** Strips sensitive keys and undefined values. Exported for tests. */
export function sanitizeLogFields(fields: LogFields = {}): LogFields {
  const out: LogFields = {};
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined) continue;
    if (SENSITIVE_FIELD.test(key)) continue;
    out[key] = value;
  }
  return out;
}

/** Writes one JSON line: `{ level, event, ...fields, ts }`. */
export function logEvent(level: LogLevel, event: string, fields?: LogFields): void {
  const line = JSON.stringify({
    level,
    event,
    ...sanitizeLogFields(fields),
    ts: new Date().toISOString(),
  });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.info(line);
}
