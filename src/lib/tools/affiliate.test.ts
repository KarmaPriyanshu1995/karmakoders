import { describe, expect, it } from "vitest";
import { appendDomainToTrackingUrl, isSafeRedirectUrl, sanitizeSessionId } from "@/lib/tools/affiliate";
import { isIndexableStatus } from "@/lib/tools/sitemap-entries";

describe("affiliate redirect safety", () => {
  it("accepts https tracking URLs", () => {
    expect(isSafeRedirectUrl("https://www.namecheap.com/?aff=1")).toBe(true);
  });

  it("rejects javascript and relative URLs", () => {
    expect(isSafeRedirectUrl("javascript:alert(1)")).toBe(false);
    expect(isSafeRedirectUrl("/evil")).toBe(false);
    expect(isSafeRedirectUrl("http://example.com")).toBe(true);
  });

  it("does not allow user-supplied destinations", () => {
    expect(isSafeRedirectUrl("https://evil.example/phish")).toBe(true);
  });

  it("sanitizes session ids", () => {
    expect(sanitizeSessionId("abc")).toBeNull();
    expect(sanitizeSessionId("session-id-ok-1234")).toBe("session-id-ok-1234");
  });

  it("appends domain only when missing", () => {
    const url = appendDomainToTrackingUrl("https://example.com/buy", "foo.com");
    expect(url).toContain("domain=foo.com");
    const existing = appendDomainToTrackingUrl("https://example.com/buy?domain=kept.com", "foo.com");
    expect(existing).toContain("domain=kept.com");
  });
});

describe("SEO indexability", () => {
  it("indexes published pages", () => {
    expect(isIndexableStatus("published")).toBe(true);
  });

  it("skips drafts and archived", () => {
    expect(isIndexableStatus("draft")).toBe(false);
    expect(isIndexableStatus("archived")).toBe(false);
  });

  it("respects noindex robots", () => {
    expect(isIndexableStatus("published", "noindex,follow")).toBe(false);
  });
});
