/**
 * Calendar-month key in UTC for free-tier usage (PlatformUsage.period, "YYYY-MM").
 */
export function freeUsagePeriodKey(date: Date = new Date()): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

/** Mirrors the SignDocumentStatus enum in prisma/schema.prisma. */
export const SIGN_DOCUMENT_STATUSES = [
  "DRAFT",
  "SENT",
  "PARTIALLY_SIGNED",
  "COMPLETED",
  "DECLINED",
  "EXPIRED",
  "VOIDED",
] as const;

export type SignDocumentStatusName = (typeof SIGN_DOCUMENT_STATUSES)[number];

/**
 * Allowed transitions for the Sign document state machine (ARCHITECTURE.md §6).
 * The brief "sending" phase is a lock (Upstash + DB transaction), not a status.
 */
export const SIGN_STATUS_TRANSITIONS: Record<SignDocumentStatusName, SignDocumentStatusName[]> = {
  DRAFT: ["SENT", "VOIDED"],
  SENT: ["PARTIALLY_SIGNED", "COMPLETED", "DECLINED", "EXPIRED", "VOIDED"],
  PARTIALLY_SIGNED: ["COMPLETED", "DECLINED", "EXPIRED", "VOIDED"],
  COMPLETED: [],
  DECLINED: [],
  EXPIRED: [],
  VOIDED: [],
};

export function canTransitionSignStatus(
  from: SignDocumentStatusName,
  to: SignDocumentStatusName
): boolean {
  return SIGN_STATUS_TRANSITIONS[from].includes(to);
}
