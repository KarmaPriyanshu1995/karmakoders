import "server-only";

import {
  CREDIT_PRO_FEATURES_LINE,
  PLANS,
  SUBSCRIPTION_PAIRS,
  formatUsd,
  yearlySavingsMonths,
} from "@/platform/billing/plans";
import type { CreditPackVM, PlanSummaryVM, SubscriptionPairVM } from "../view-models";

/** Credit packs and subscription pairs for the billing screen. plans.ts is the only price source. */
export function billingOffers(plan: Pick<PlanSummaryVM, "planName">): {
  creditPacks: CreditPackVM[];
  subscriptions: SubscriptionPairVM[];
} {
  const creditPacks = (["credits_10", "credits_30"] as const).map((id) => {
    const pack = PLANS[id];
    return {
      id,
      name: pack.displayName,
      description: pack.description,
      price: formatUsd(pack.amountCents),
      credits: pack.creditsGranted,
      features: [CREDIT_PRO_FEATURES_LINE, ...pack.features.slice(1)],
    };
  });

  const subscriptions = SUBSCRIPTION_PAIRS.map((pair) => {
    const monthly = PLANS[pair.month];
    const yearly = PLANS[pair.year];
    return {
      product: pair.product,
      name: monthly.displayName,
      description: monthly.description,
      features: monthly.features,
      monthly: { id: monthly.id, price: formatUsd(monthly.amountCents) },
      yearly: { id: yearly.id, price: formatUsd(yearly.amountCents), savingsMonths: yearlySavingsMonths(monthly, yearly) },
      current: plan.planName === monthly.displayName || plan.planName === yearly.displayName,
    };
  });

  return { creditPacks, subscriptions };
}
