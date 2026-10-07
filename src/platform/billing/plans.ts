import "server-only";

import { getPaddleServerEnv } from "@/platform/env/server";

export type ToolSlug = "sign";

export const TOOL_COST = { sign: 1 } as const satisfies Record<ToolSlug, number>;

export type PlanKind = "free" | "credits" | "subscription";
export type BillingInterval = "one_time" | "month" | "year" | "none";

export type PlanId =
  | "free"
  | "credits_10"
  | "credits_30"
  | "sign_pro_monthly"
  | "sign_pro_yearly"
  | "all_access_monthly"
  | "all_access_yearly";

export interface PlanDefinition {
  id: PlanId;
  kind: PlanKind;
  displayName: string;
  description: string;
  features: string[];
  /** Price in USD cents. Free is 0. */
  amountCents: number;
  interval: BillingInterval;
  /** Credits granted on purchase (0 for free / unlimited subscriptions). */
  creditsGranted: number;
  /** Tools unlocked by this entitlement. Empty means credits-only wallet top-up. */
  unlocksTools: ToolSlug[] | "all";
  freeSendsPerCalendarMonth?: number;
  maxSigners?: number;
  showKarmaKodersFooter?: boolean;
  paddlePriceEnvKey?:
    | "PADDLE_PRICE_CREDITS_10"
    | "PADDLE_PRICE_CREDITS_30"
    | "PADDLE_PRICE_SIGN_PRO_MONTHLY"
    | "PADDLE_PRICE_SIGN_PRO_YEARLY"
    | "PADDLE_PRICE_ALL_ACCESS_MONTHLY"
    | "PADDLE_PRICE_ALL_ACCESS_YEARLY";
}

export const PLANS: Record<PlanId, PlanDefinition> = {
  free: {
    id: "free",
    kind: "free",
    displayName: "Free",
    description: "Try KarmaKoders Sign with a small monthly send allowance.",
    features: [
      "3 sent documents per calendar month",
      "Up to 2 signers per document",
      "KarmaKoders footer on documents and emails",
      "Audit trail and verification page",
    ],
    amountCents: 0,
    interval: "none",
    creditsGranted: 0,
    unlocksTools: ["sign"],
    freeSendsPerCalendarMonth: 3,
    maxSigners: 2,
    showKarmaKodersFooter: true,
  },
  credits_10: {
    id: "credits_10",
    kind: "credits",
    displayName: "10 Credits",
    description: "One-time pack. Credits never expire and work across KarmaKoders tools.",
    features: [
      "10 credits (1 credit = 1 sent Sign document)",
      "Never expire",
      "Shared wallet across current and future tools",
    ],
    amountCents: 1000,
    interval: "one_time",
    creditsGranted: 10,
    unlocksTools: [],
    paddlePriceEnvKey: "PADDLE_PRICE_CREDITS_10",
  },
  credits_30: {
    id: "credits_30",
    kind: "credits",
    displayName: "30 Credits",
    description: "Best value one-time pack. Credits never expire.",
    features: [
      "30 credits (1 credit = 1 sent Sign document)",
      "Never expire",
      "Shared wallet across current and future tools",
    ],
    amountCents: 2500,
    interval: "one_time",
    creditsGranted: 30,
    unlocksTools: [],
    paddlePriceEnvKey: "PADDLE_PRICE_CREDITS_30",
  },
  sign_pro_monthly: {
    id: "sign_pro_monthly",
    kind: "subscription",
    displayName: "Sign Pro",
    description: "Unlimited Sign sends for professionals who sign every week.",
    features: [
      "Unlimited sent documents in Sign",
      "No per-seat fees",
      "Remove KarmaKoders footer",
      "Priority email support",
    ],
    amountCents: 1500,
    interval: "month",
    creditsGranted: 0,
    unlocksTools: ["sign"],
    paddlePriceEnvKey: "PADDLE_PRICE_SIGN_PRO_MONTHLY",
  },
  sign_pro_yearly: {
    id: "sign_pro_yearly",
    kind: "subscription",
    displayName: "Sign Pro (Yearly)",
    description: "Sign Pro billed annually — two months free vs monthly.",
    features: [
      "Unlimited sent documents in Sign",
      "No per-seat fees",
      "Remove KarmaKoders footer",
      "Priority email support",
      "Save vs paying monthly",
    ],
    amountCents: 15000,
    interval: "year",
    creditsGranted: 0,
    unlocksTools: ["sign"],
    paddlePriceEnvKey: "PADDLE_PRICE_SIGN_PRO_YEARLY",
  },
  all_access_monthly: {
    id: "all_access_monthly",
    kind: "subscription",
    displayName: "All Access",
    description: "Every current and future KarmaKoders tool, including Sign.",
    features: [
      "Sign Pro included",
      "All current and future KarmaKoders tools",
      "Shared credit wallet still available for à-la-carte use",
      "No per-seat fees",
    ],
    amountCents: 2900,
    interval: "month",
    creditsGranted: 0,
    unlocksTools: "all",
    paddlePriceEnvKey: "PADDLE_PRICE_ALL_ACCESS_MONTHLY",
  },
  all_access_yearly: {
    id: "all_access_yearly",
    kind: "subscription",
    displayName: "All Access (Yearly)",
    description: "All Access billed annually — two months free vs monthly.",
    features: [
      "Sign Pro included",
      "All current and future KarmaKoders tools",
      "Shared credit wallet still available for à-la-carte use",
      "No per-seat fees",
      "Save vs paying monthly",
    ],
    amountCents: 29000,
    interval: "year",
    creditsGranted: 0,
    unlocksTools: "all",
    paddlePriceEnvKey: "PADDLE_PRICE_ALL_ACCESS_YEARLY",
  },
};

export const PAID_PLAN_IDS = (Object.keys(PLANS) as PlanId[]).filter(
  (id): id is Exclude<PlanId, "free"> => PLANS[id].kind !== "free"
);

export type PriceIdMap = Record<Exclude<PlanId, "free">, string>;

/**
 * Maps each paid plan to its Paddle price ID from env.
 * Validates Paddle server env only on first call.
 */
export function getPriceIdMap(): PriceIdMap {
  const env = getPaddleServerEnv();
  return {
    credits_10: env.PADDLE_PRICE_CREDITS_10,
    credits_30: env.PADDLE_PRICE_CREDITS_30,
    sign_pro_monthly: env.PADDLE_PRICE_SIGN_PRO_MONTHLY,
    sign_pro_yearly: env.PADDLE_PRICE_SIGN_PRO_YEARLY,
    all_access_monthly: env.PADDLE_PRICE_ALL_ACCESS_MONTHLY,
    all_access_yearly: env.PADDLE_PRICE_ALL_ACCESS_YEARLY,
  };
}

/** Reverse lookup: Paddle price id → plan definition (excluding free). */
export function getPlanByPriceId(priceId: string): PlanDefinition | null {
  const map = getPriceIdMap();
  for (const planId of PAID_PLAN_IDS) {
    if (map[planId] === priceId) return PLANS[planId];
  }
  return null;
}

export function getPlan(planId: PlanId): PlanDefinition {
  return PLANS[planId];
}

/** Plans shown on /tools/sign/pricing, in display order. */
export const PRICING_PLAN_IDS = [
  "free",
  "credits_10",
  "credits_30",
  "sign_pro_monthly",
  "sign_pro_yearly",
  "all_access_monthly",
  "all_access_yearly",
] as const satisfies readonly PlanId[];

/** Monthly ↔ yearly pairs for the pricing toggle. */
export const SUBSCRIPTION_PAIRS = [
  { product: "sign_pro", month: "sign_pro_monthly", year: "sign_pro_yearly" },
  { product: "all_access", month: "all_access_monthly", year: "all_access_yearly" },
] as const satisfies readonly { product: string; month: PlanId; year: PlanId }[];

/** Whole months saved by paying yearly vs 12 × monthly (e.g. $150 vs $180 → 2). */
export function yearlySavingsMonths(monthly: PlanDefinition, yearly: PlanDefinition): number {
  if (monthly.interval !== "month" || yearly.interval !== "year" || monthly.amountCents <= 0) return 0;
  return Math.round((monthly.amountCents * 12 - yearly.amountCents) / monthly.amountCents);
}

/** USD display from integer cents: 1000 → "$10", 2500 → "$25", 1550 → "$15.50". */
export function formatUsd(cents: number): string {
  if (!Number.isInteger(cents) || cents < 0) throw new Error(`formatUsd: invalid cents ${cents}`);
  const dollars = Math.floor(cents / 100);
  const rest = cents % 100;
  return rest === 0 ? `$${dollars}` : `$${dollars}.${String(rest).padStart(2, "0")}`;
}

/** Columns of the comparison table (credit packs share one column). */
export type ComparisonColumn = "free" | "credits" | "sign_pro" | "all_access";

export const COMPARISON_COLUMNS: { id: ComparisonColumn; label: string }[] = [
  { id: "free", label: "Free" },
  { id: "credits", label: "Credits" },
  { id: "sign_pro", label: "Sign Pro" },
  { id: "all_access", label: "All Access" },
];

/**
 * Feature comparison by plan. Only facts sourced from this file / docs/PRD.md §5 are listed.
 * `true` = included, `false` = not included, string = value.
 */
export const PLAN_COMPARISON: { feature: string; values: Record<ComparisonColumn, string | boolean> }[] = [
  {
    feature: "Sent documents",
    values: {
      free: `${PLANS.free.freeSendsPerCalendarMonth} per calendar month`,
      credits: `1 credit per sent document`,
      sign_pro: "Unlimited",
      all_access: "Unlimited",
    },
  },
  {
    feature: "Audit trail, certificate and verification page",
    values: { free: true, credits: true, sign_pro: true, all_access: true },
  },
  {
    feature: "Signers never need an account",
    values: { free: true, credits: true, sign_pro: true, all_access: true },
  },
  {
    feature: "Credits never expire",
    values: { free: false, credits: true, sign_pro: false, all_access: false },
  },
  {
    feature: "Works across all KarmaKoders tools",
    values: { free: false, credits: true, sign_pro: false, all_access: true },
  },
  {
    feature: "No per-seat fees",
    values: { free: true, credits: true, sign_pro: true, all_access: true },
  },
];

/**
 * Comparison facts the product owner has not confirmed yet. Not shown on the pricing page
 * until provided (docs/specs/task-3b-public-pages.md, "Decisions").
 */
export const PENDING_COMPARISON_FACTS = [
  "Signers per document on Credits, Sign Pro and All Access (Free: up to 2)",
  "Whether documents sent with credits carry the KarmaKoders footer",
] as const;
