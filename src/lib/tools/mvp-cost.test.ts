import { describe, expect, it } from "vitest";
import { estimateMvpCost, formatUsdRange } from "@/lib/tools/mvp-cost";

describe("MVP cost calculator", () => {
  it("prices a starter MVP without compliance at the base band", () => {
    const result = estimateMvpCost({ userLoad: "under-1k", tier: "starter", compliance: "none" });
    expect(result.weeks).toBe(4);
    expect(result.low).toBe(Math.round(8000 * 0.85));
    expect(result.high).toBe(Math.round(8000 * 1.2));
  });

  it("adds HIPAA and load multiplier for enterprise", () => {
    const result = estimateMvpCost({ userLoad: "100k-plus", tier: "enterprise", compliance: "hipaa" });
    const mid = Math.round((40000 + 8000) * 1.8);
    expect(result.low).toBe(Math.round(mid * 0.85));
    expect(result.high).toBe(Math.round(mid * 1.2));
    expect(result.weeks).toBe(16);
  });

  it("formats a USD range", () => {
    expect(formatUsdRange(8000, 12000)).toContain("8,000");
    expect(formatUsdRange(8000, 12000)).toContain("12,000");
  });
});
