import { describe, expect, it } from "vitest";
import { postViewCount } from "@/lib/content/view-count";

describe("postViewCount", () => {
  it("reads viewCount when present and defaults to 0", () => {
    expect(postViewCount({ viewCount: 12 })).toBe(12);
    expect(postViewCount({ title: "No views field" })).toBe(0);
    expect(postViewCount(null)).toBe(0);
  });
});
