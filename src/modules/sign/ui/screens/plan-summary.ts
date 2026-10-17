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
  // All Access beats Sign Pro, as in activePlanName.
  const best = profile.subscriptions.find((s) => s.product === "ALL_ACCESS") ?? profile.subscriptions[0];
  const subscriptionName = best ? PLANS[best.product === "ALL_ACCESS" ? "all_access_monthly" : "sign_pro_monthly"].displayName : null;
  const renewsAt = best?.currentPeriodEnd ?? null;

  return {
    kind,
    planName: activePlanName(profile.subscriptions),
    subscriptionName,
    creditsBalance: profile.creditsBalance,
    maxSigners: kind === "free" ? freeMaxSigners : paidMaxSigners,
    freeMaxSigners,
    freeUsed: Math.min(Math.max(usage.freeUsed, 0), freeLimit),
    freeLimit,
    renewsAt,
  };
}
