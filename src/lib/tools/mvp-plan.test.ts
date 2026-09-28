import { describe, expect, it } from "vitest";
import { PRODUCT_PRESETS, buildMvpPlan, mvpPlanMessage, type MvpPlanInput } from "@/lib/tools/mvp-plan";

const starter: MvpPlanInput = {
  product: "saas",
  platforms: ["web"],
  modules: ["billing", "admin"],
  design: "existing",
  pace: "steady",
  userLoad: "under-1k",
  compliance: "none",
};

describe("MVP development planner", () => {
  it("prices a SaaS starter with billing and admin", () => {
    const plan = buildMvpPlan(starter);
    const mid = plan.lines.reduce((sum, line) => sum + line.amount, 0);
    expect(plan.weeks).toBe(8);
    expect(mid).toBe(23520);
    expect(plan.low).toBe(19992);
    expect(plan.high).toBe(27754);
    expect(plan.monthlyLow).toBe(120);
    expect(plan.phases.reduce((sum, phase) => sum + phase.weeks, 0)).toBe(plan.weeks);
  });

  it("adds HIPAA on top of engineering and QA", () => {
    const plan = buildMvpPlan({ ...starter, compliance: "hipaa" });
    expect(plan.lines.find((line) => line.id === "compliance")?.amount).toBe(8000);
    expect(plan.low).toBe(27608);
  });

  it("shortens the calendar and raises cost on an accelerated pace", () => {
    const steady = buildMvpPlan(starter);
    const fast = buildMvpPlan({ ...starter, pace: "accelerated" });
    expect(fast.weeks).toBeLessThan(steady.weeks);
    expect(fast.high).toBeGreaterThan(steady.high);
  });

  it("warns when a marketplace cannot take payment", () => {
    const plan = buildMvpPlan({
      ...starter,
      product: "marketplace",
      platforms: PRODUCT_PRESETS.marketplace.platforms,
      modules: ["admin"],
    });
    expect(plan.risks.some((risk) => risk.tone === "warn" && risk.text.includes("billing"))).toBe(true);
  });

  it("exports a plan without turning the breakdown into a range", () => {
    const message = mvpPlanMessage(buildMvpPlan(starter));
    expect(message).toContain("Billing:");
    expect(message).toContain("planning range, not a quote");
    expect(message).not.toContain("undefined");
  });
});
