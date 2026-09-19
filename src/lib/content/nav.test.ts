import { describe, expect, it } from "vitest";
import { navItemIsActive, PRIMARY_NAV } from "@/lib/content/nav";

describe("primary nav", () => {
  it("keeps exactly five top-level items plus nested Work and Insights", () => {
    expect(PRIMARY_NAV.map((item) => item.name)).toEqual(["Services", "Work", "Insights", "Pricing", "About"]);
    expect(PRIMARY_NAV.find((item) => item.name === "Work")?.children?.map((c) => c.name)).toEqual([
      "Portfolio",
      "Case Studies",
      "Success Stories",
    ]);
  });

  it("marks nested insight routes as active on Insights", () => {
    const insights = PRIMARY_NAV.find((item) => item.name === "Insights")!;
    expect(navItemIsActive("/blog/some-post", insights)).toBe(true);
    expect(navItemIsActive("/free-tools/domain-compare", insights)).toBe(true);
    expect(navItemIsActive("/pricing", insights)).toBe(false);
  });

  it("exposes crawlable hub URLs on Work and Insights", () => {
    expect(PRIMARY_NAV.find((item) => item.name === "Work")?.href).toBe("/work");
    expect(PRIMARY_NAV.find((item) => item.name === "Insights")?.href).toBe("/insights");
  });
});
