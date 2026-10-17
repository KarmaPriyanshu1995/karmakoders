import "server-only";

import { PLANS, activePlanName } from "@/platform/billing/plans";
import type { CustomerProfile } from "@/platform/auth/profile";
import type { PlanSummaryVM } from "../view-models";

/**
 * Builds the plan view model from the real customer profile (credits, subscriptions) and the
 * plan limits in plans.ts. `freeUsed` is passed in: free-send usage is not recorded yet.
 */
export function planSummaryFrom(
  profile: Pick<CustomerProfile, "creditsBalance" | "subscriptions">,
  usage: { freeUsed: number }
): PlanSummaryVM {
  const free = PLANS.free;
  const freeLimit = free.freeSendsPerCalendarMonth ?? 0;
  const freeMaxSigners = free.maxSigners ?? 1;
  const hasSubscription = profile.subscriptions.length > 0;
  const kind = hasSubscription ? "pro" : profile.creditsBalance > 0 ? "credits" : "free";
  const paidMaxSigners = PLANS.sign_pro_monthly.maxSigners ?? freeMaxSigners;
  const renewsAt =
    profile.subscriptions.find((s) => s.product === "ALL_ACCESS")?.currentPeriodEnd ??
    profile.subscriptions[0]?.currentPeriodEnd ??
    null;

  return {
    kind,
    planName: activePlanName(profile.subscriptions),
    creditsBalance: profile.creditsBalance,
    maxSigners: kind === "free" ? freeMaxSigners : paidMaxSigners,
    freeMaxSigners,
    freeUsed: Math.min(Math.max(usage.freeUsed, 0), freeLimit),
    freeLimit,
    renewsAt,
  };
}
