import { describe, expect, it } from "vitest";
import { isBotUserAgent } from "@/lib/content/view-bots";

describe("isBotUserAgent", () => {
  it("skips crawlers and keeps normal browsers", () => {
    expect(isBotUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64)")).toBe(false);
    expect(isBotUserAgent("Googlebot/2.1")).toBe(true);
    expect(isBotUserAgent("facebookexternalhit/1.1")).toBe(true);
  });
});
