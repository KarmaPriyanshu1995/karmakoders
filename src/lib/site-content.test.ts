import { describe, expect, it } from "vitest";
import { DEFAULT_SITE_CONTENT, mergeSiteContent } from "./site-content";

describe("mergeSiteContent", () => {
  it("keeps code defaults when nothing is saved", () => {
    const merged = mergeSiteContent(null);
    expect(merged.brand.legalName).toBe(DEFAULT_SITE_CONTENT.brand.legalName);
    expect(merged.testimonials).toHaveLength(3);
    expect(merged.team[0].name).toBe("Priyanshu Singh");
    expect(merged.badges.length).toBeGreaterThan(0);
    expect(merged.pricing.tiers[0].from).toContain("$");
  });

  it("overrides a testimonial and a price from admin JSON", () => {
    const merged = mergeSiteContent({
      testimonials: [
        {
          quote: "Live quote from admin",
          name: "Lucky",
          role: "Founder",
          company: "KarmaKoders",
          country: "India",
        },
      ],
      team: [{ name: "Lucky", role: "CEO" }],
      pricing: {
        tiers: [{ id: "starter", from: "Starting from $7,500", typical: "$7k–$14k" }],
      },
    });
    expect(merged.testimonials[0].quote).toBe("Live quote from admin");
    expect(merged.team[0].name).toBe("Lucky");
    expect(merged.pricing.tiers[0].from).toBe("Starting from $7,500");
  });
});
