import type { PlanSummaryVM } from "../view-models";

/**
 * What sending this document will use, in the entitlement order of ARCHITECTURE.md §7:
 * free sends this month (if signers ≤ the free limit) → subscription → credits → payment.
 * Display only: the server re-checks entitlement at send (Step 9/10).
 */
export type CostLine =
  | { kind: "free"; nth: number; limit: number }
  | { kind: "pro"; planName: string }
  | { kind: "credit"; balanceAfter: number }
  | { kind: "payment_required"; reason: "out_of_free" | "too_many_signers"; freeMaxSigners: number };

export function costLineFor(plan: PlanSummaryVM, signerCount: number): CostLine {
  const freeLeft = plan.freeLimit - plan.freeUsed;
  if (freeLeft > 0 && signerCount <= plan.freeMaxSigners) {
    return { kind: "free", nth: plan.freeUsed + 1, limit: plan.freeLimit };
  }
  if (plan.kind === "pro") return { kind: "pro", planName: plan.planName };
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
    case "free":
      return `Free document ${cost.nth} of ${cost.limit} this month`;
    case "pro":
      return `Included in ${cost.planName}`;
    case "credit":
      return "Uses 1 credit";
    case "payment_required":
      return cost.reason === "out_of_free"
        ? "You're out of free documents"
        : `Free documents allow up to ${cost.freeMaxSigners} signers`;
  }
}
