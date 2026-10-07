import "server-only";

import { prisma } from "@/platform/db";
import { logEvent, maskEmail } from "@/platform/logger";
import { EARLY_ACCESS_HONEYPOT_FIELD, earlyAccessSchema, type EarlyAccessInput } from "./schema";

export type SubmitEarlyAccessResult =
  | { ok: true; created: boolean }
  | { ok: false; reason: "honeypot" | "invalid_email" | "invalid" };

/**
 * Stores an early-access signup. A duplicate email is a no-op success (skipDuplicates on the
 * unique email), so callers can show the same message for new and repeat signups.
 * Honeypot submissions are rejected without touching the database.
 */
export async function submitEarlyAccess(input: EarlyAccessInput): Promise<SubmitEarlyAccessResult> {
  const parsed = earlyAccessSchema.safeParse(input);
  if (!parsed.success) {
    const emailInvalid = parsed.error.issues.some((issue) => issue.path[0] === "email");
    return { ok: false, reason: emailInvalid ? "invalid_email" : "invalid" };
  }

  const data = parsed.data;
  if (data[EARLY_ACCESS_HONEYPOT_FIELD]) {
    logEvent("warn", "early_access_honeypot", { source: data.source });
    return { ok: false, reason: "honeypot" };
  }

  const { count } = await prisma.signEarlyAccess.createMany({
    data: [{ email: data.email, company: data.company, role: data.role, source: data.source }],
    skipDuplicates: true,
  });

  logEvent("info", "early_access_signup", {
    to: maskEmail(data.email),
    created: count === 1,
    source: data.source,
  });
  return { ok: true, created: count === 1 };
}
