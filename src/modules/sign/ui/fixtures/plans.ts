import type { PlanSummaryVM } from "../view-models";

/**
 * Plan fixtures. Limits mirror plans.ts (free: 3 sends a month, 2 signers; paid: 10 signers);
 * fixtures.test.ts checks they stay in sync. Pages build the real summary with planSummaryFrom.
 */

const FREE_BASE = {
  kind: "free",
  planName: "Free",
  subscriptionName: null,
  creditsBalance: 0,
  maxSigners: 2,
  freeMaxSigners: 2,
  freeLimit: 3,
  renewsAt: null,
} as const satisfies Omit<PlanSummaryVM, "freeUsed">;

export const PLAN_FREE_NEW: PlanSummaryVM = { ...FREE_BASE, freeUsed: 0 };
export const PLAN_FREE_TWO_USED: PlanSummaryVM = { ...FREE_BASE, freeUsed: 2 };
export const PLAN_FREE_AT_LIMIT: PlanSummaryVM = { ...FREE_BASE, freeUsed: 3 };

export const PLAN_CREDITS: PlanSummaryVM = {
  kind: "credits",
  planName: "Free",
  subscriptionName: null,
  creditsBalance: 12,
  maxSigners: 10,
  freeMaxSigners: 2,
  freeUsed: 3,
  freeLimit: 3,
  renewsAt: null,
};

export const PLAN_PRO: PlanSummaryVM = {
  kind: "pro",
  planName: "Sign Pro",
  subscriptionName: "Sign Pro",
  creditsBalance: 4,
  maxSigners: 10,
  freeMaxSigners: 2,
  // Subscribers never consume the free allowance.
  freeUsed: 0,
  freeLimit: 3,
  renewsAt: "2026-11-17T00:00:00.000Z",
};

export const PLAN_ALL_ACCESS: PlanSummaryVM = {
  ...PLAN_PRO,
  planName: "All Access (Yearly)",
  subscriptionName: "All Access",
  creditsBalance: 0,
  renewsAt: "2027-09-01T00:00:00.000Z",
};

export const PLAN_FIXTURES = {
  freeNew: PLAN_FREE_NEW,
  freeTwoUsed: PLAN_FREE_TWO_USED,
  freeAtLimit: PLAN_FREE_AT_LIMIT,
  credits: PLAN_CREDITS,
  pro: PLAN_PRO,
  allAccess: PLAN_ALL_ACCESS,
} as const;
