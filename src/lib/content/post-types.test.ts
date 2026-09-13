import { describe, expect, it } from "vitest";
import { usesNewsletterSignup } from "@/lib/content/post-types";

describe("usesNewsletterSignup", () => {
  it("shows an inline form for default blog CTAs", () => {
    expect(usesNewsletterSignup("blog")).toBe(true);
  });

  it("keeps a link when the blog CTA is overridden or hosted elsewhere", () => {
    expect(usesNewsletterSignup("blog", { ctaOverrideHref: "/contact" })).toBe(false);
    expect(usesNewsletterSignup("blog", { newsletterHref: "https://example.com/newsletter" })).toBe(false);
    expect(usesNewsletterSignup("case-study")).toBe(false);
  });
});
