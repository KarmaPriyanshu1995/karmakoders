import type { ActivityEventVM, IsoDate } from "../view-models";

/**
 * Display helpers shared by the screens. Dates are formatted in UTC with a fixed locale so the
 * server and client render the same text (no hydration mismatch) and tests are deterministic.
 */

const DATE = new Intl.DateTimeFormat("en-US", { timeZone: "UTC", month: "short", day: "numeric", year: "numeric" });
const DATE_TIME = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

/** "Oct 17, 2026" */
export function formatDate(iso: IsoDate): string {
  return DATE.format(new Date(iso));
}

/** "Oct 17, 2026, 2:05 PM UTC" */
export function formatDateTime(iso: IsoDate): string {
  return `${DATE_TIME.format(new Date(iso))} UTC`;
}

/** Plain-English line for one audit event, e.g. "Jordan Lee signed the document". */
export function activityLabel(event: Pick<ActivityEventVM, "kind" | "actor">): string {
  switch (event.kind) {
    case "created":
      return `${event.actor} created the document`;
    case "sent":
      return `${event.actor} sent the document for signature`;
    case "viewed":
      return `${event.actor} opened the document`;
    case "signed":
      return `${event.actor} signed the document`;
    case "declined":
      return `${event.actor} declined to sign`;
    case "reminded":
      return `${event.actor} sent a reminder`;
    case "voided":
      return `${event.actor} voided the document`;
    case "expired":
      return "The signing link expired";
    case "completed":
      return "Everyone signed. The document is complete";
  }
}

/** "1 signer", "10 signers". */
export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}
