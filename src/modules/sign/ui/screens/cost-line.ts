import type { PlanSummaryVM } from "../view-models";

/**
 * What sending this document will use, in the entitlement order of ARCHITECTURE.md §7:
 * active subscription (never consumes the free allowance) → free sends this month (if signers
 * ≤ the free limit) → credits → payment. Display only: the server re-checks at send (Step 9/10).
 */
export type CostLine =
  | { kind: "pro"; subscriptionName: string }
  | { kind: "free"; nth: number; limit: number }
  | { kind: "credit"; balanceAfter: number }
  | { kind: "payment_required"; reason: "out_of_free" | "too_many_signers"; freeMaxSigners: number };

export function costLineFor(plan: PlanSummaryVM, signerCount: number): CostLine {
  if (plan.kind === "pro" && plan.subscriptionName) return { kind: "pro", subscriptionName: plan.subscriptionName };
  const freeLeft = plan.freeLimit - plan.freeUsed;
  if (freeLeft > 0 && signerCount <= plan.freeMaxSigners) {
    return { kind: "free", nth: plan.freeUsed + 1, limit: plan.freeLimit };
  }
  if (plan.creditsBalance > 0) return { kind: "credit", balanceAfter: plan.creditsBalance - 1 };
  return {
    kind: "payment_required",
    reason: freeLeft > 0 ? "too_many_signers" : "out_of_free",
    freeMaxSigners: plan.freeMaxSigners,
  };
}

/** The headline sentence for a cost line. */
export function costLineText(cost: CostLine): string {
  switch (cost.kind) {
    case "pro":
      return `Included in ${cost.subscriptionName}`;
    case "free":
      return `Free document ${cost.nth} of ${cost.limit} this month`;
    case "credit":
      return "Uses 1 credit";
    case "payment_required":
      return cost.reason === "out_of_free"
        ? "You're out of free documents"
        : `Free documents allow up to ${cost.freeMaxSigners} signers`;
  }
}
