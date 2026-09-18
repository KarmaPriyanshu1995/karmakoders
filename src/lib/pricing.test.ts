import { describe, expect, it } from "vitest";
import { PRICING, pricingForTier } from "./pricing";

describe("pricing config", () => {
  it("exposes a starting number for every named tier", () => {
    expect(PRICING.tiers).toHaveLength(3);
    for (const tier of PRICING.tiers) {
      expect(tier.from.length).toBeGreaterThan(3);
      expect(tier.typical.length).toBeGreaterThan(3);
    }
  });

  it("maps engagement model names onto config rows", () => {
    expect(pricingForTier("Starter").id).toBe("starter");
    expect(pricingForTier("Growth").popular).toBe(true);
    expect(pricingForTier("Enterprise").from).toBe("Custom");
  });
});
