import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  PLANS,
  TOOL_COST,
  getPlan,
  getPlanByPriceId,
  getPriceIdMap,
} from "@/platform/billing/plans";

const PADDLE_ENV = {
  PADDLE_API_KEY: "pdl_sdbx_test",
  PADDLE_WEBHOOK_SECRET: "pdl_ntfset_test",
  PADDLE_PRICE_CREDITS_10: "pri_credits_10",
  PADDLE_PRICE_CREDITS_30: "pri_credits_30",
  PADDLE_PRICE_SIGN_PRO_MONTHLY: "pri_sign_pro_m",
  PADDLE_PRICE_SIGN_PRO_YEARLY: "pri_sign_pro_y",
  PADDLE_PRICE_ALL_ACCESS_MONTHLY: "pri_all_m",
  PADDLE_PRICE_ALL_ACCESS_YEARLY: "pri_all_y",
};

describe("TOOL_COST", () => {
  it("charges 1 credit per Sign send", () => {
    expect(TOOL_COST.sign).toBe(1);
  });
});

describe("PLANS pricing", () => {
  it("defines free tier limits from the PRD", () => {
    const free = getPlan("free");
    expect(free.freeSendsPerCalendarMonth).toBe(3);
    expect(free.maxSigners).toBe(2);
    expect(free.showKarmaKodersFooter).toBe(true);
    expect(free.amountCents).toBe(0);
  });

  it("sets credit packs to $10 / $25 with 10 / 30 credits", () => {
    expect(PLANS.credits_10.amountCents).toBe(1000);
    expect(PLANS.credits_10.creditsGranted).toBe(10);
    expect(PLANS.credits_30.amountCents).toBe(2500);
    expect(PLANS.credits_30.creditsGranted).toBe(30);
  });

  it("sets yearly subscription prices to 10× monthly", () => {
    expect(PLANS.sign_pro_yearly.amountCents).toBe(PLANS.sign_pro_monthly.amountCents * 10);
    expect(PLANS.all_access_yearly.amountCents).toBe(PLANS.all_access_monthly.amountCents * 10);
  });
});

describe("Paddle price id map", () => {
  beforeEach(() => {
    for (const [key, value] of Object.entries(PADDLE_ENV)) {
      process.env[key] = value;
    }
  });

  afterEach(() => {
    for (const key of Object.keys(PADDLE_ENV)) {
      delete process.env[key];
    }
  });

  it("maps each paid plan to its env price id", () => {
    const map = getPriceIdMap();
    expect(map.credits_10).toBe("pri_credits_10");
    expect(map.sign_pro_yearly).toBe("pri_sign_pro_y");
    expect(map.all_access_monthly).toBe("pri_all_m");
  });

  it("reverse-looks up a plan by Paddle price id", () => {
    const plan = getPlanByPriceId("pri_credits_30");
    expect(plan?.id).toBe("credits_30");
    expect(getPlanByPriceId("pri_unknown")).toBeNull();
  });
});

describe("pricing page helpers", () => {
  it("yearlySavingsMonths: yearly = 10 × monthly → 2 months free", async () => {
    const { yearlySavingsMonths, SUBSCRIPTION_PAIRS } = await import("@/platform/billing/plans");
    for (const pair of SUBSCRIPTION_PAIRS) {
      expect(yearlySavingsMonths(PLANS[pair.month], PLANS[pair.year])).toBe(2);
    }
    expect(yearlySavingsMonths(PLANS.credits_10, PLANS.credits_30)).toBe(0);
  });

  it("formatUsd renders integer cents without floats", async () => {
    const { formatUsd } = await import("@/platform/billing/plans");
    expect(formatUsd(0)).toBe("$0");
    expect(formatUsd(1000)).toBe("$10");
    expect(formatUsd(2500)).toBe("$25");
    expect(formatUsd(1550)).toBe("$15.50");
    expect(formatUsd(29000)).toBe("$290");
    expect(() => formatUsd(10.5)).toThrow();
    expect(() => formatUsd(-1)).toThrow();
  });

  it("comparison table has a value for every column and sources the free quota from PLANS", async () => {
    const { PLAN_COMPARISON, COMPARISON_COLUMNS } = await import("@/platform/billing/plans");
    for (const row of PLAN_COMPARISON) {
      expect(Object.keys(row.values).sort()).toEqual(COMPARISON_COLUMNS.map((c) => c.id).sort());
    }
    expect(PLAN_COMPARISON[0].values.free).toBe(`${PLANS.free.freeSendsPerCalendarMonth} per calendar month`);
  });

  it("pricing plan list covers every plan exactly once", async () => {
    const { PRICING_PLAN_IDS } = await import("@/platform/billing/plans");
    expect([...PRICING_PLAN_IDS].sort()).toEqual(Object.keys(PLANS).sort());
  });
});

describe("signer limits and footer (product owner decision 2026-10-07)", () => {
  it("allows 2 signers on Free and 10 on every paid plan", () => {
    expect(PLANS.free.maxSigners).toBe(2);
    for (const id of ["credits_10", "credits_30", "sign_pro_monthly", "sign_pro_yearly", "all_access_monthly", "all_access_yearly"] as const) {
      expect(PLANS[id].maxSigners, id).toBe(10);
    }
  });

  it("shows the KarmaKoders footer on Free only (credit sends have no footer)", () => {
    expect(PLANS.free.showKarmaKodersFooter).toBe(true);
    for (const id of ["credits_10", "credits_30", "sign_pro_monthly", "sign_pro_yearly", "all_access_monthly", "all_access_yearly"] as const) {
      expect(PLANS[id].showKarmaKodersFooter, id).toBe(false);
    }
  });

  it("comparison table reflects signer limits and footer", async () => {
    const { PLAN_COMPARISON } = await import("@/platform/billing/plans");
    const signers = PLAN_COMPARISON.find((r) => r.feature === "Signers per document")!;
    expect(signers.values).toEqual({ free: "Up to 2", credits: "Up to 10", sign_pro: "Up to 10", all_access: "Up to 10" });
    const footer = PLAN_COMPARISON.find((r) => r.feature === "No KarmaKoders footer on documents")!;
    expect(footer.values).toEqual({ free: false, credits: true, sign_pro: true, all_access: true });
  });

  it("exposes the credit Pro-features line", async () => {
    const { CREDIT_PRO_FEATURES_LINE } = await import("@/platform/billing/plans");
    expect(CREDIT_PRO_FEATURES_LINE).toBe("Each credit sends one document with Pro features.");
  });
});
