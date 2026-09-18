import { describe, expect, it } from "vitest";
import { isBookableUrl } from "./brand";

describe("isBookableUrl", () => {
  it("rejects a host-only Cal homepage", () => {
    expect(isBookableUrl("https://cal.com")).toBe(false);
    expect(isBookableUrl("https://calendly.com/")).toBe(false);
  });

  it("accepts a username or event path", () => {
    expect(isBookableUrl("https://cal.com/karmakoders")).toBe(true);
    expect(isBookableUrl("https://calendly.com/team/intro")).toBe(true);
  });

  it("rejects unrelated hosts", () => {
    expect(isBookableUrl("https://example.com/book")).toBe(false);
  });
});
