import { describe, expect, it } from "vitest";
import { alternativeDomains, parseDomainInput } from "@/lib/tools/domain";

describe("parseDomainInput", () => {
  it("accepts example.com", () => {
    expect(parseDomainInput("example.com")).toEqual({
      ok: true,
      value: { domain: "example.com", sld: "example", tld: "com", assumedTld: false },
    });
  });

  it("accepts example.ai", () => {
    const result = parseDomainInput("example.ai");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.domain).toBe("example.ai");
  });

  it("strips www", () => {
    const result = parseDomainInput("www.example.com");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.domain).toBe("example.com");
  });

  it("strips https", () => {
    const result = parseDomainInput("https://example.com");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.domain).toBe("example.com");
  });

  it("defaults example to example.com", () => {
    const result = parseDomainInput("example");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.domain).toBe("example.com");
      expect(result.value.assumedTld).toBe(true);
    }
  });

  it("rejects garbage input", () => {
    expect(parseDomainInput("not a domain")).toEqual({ ok: false, message: "Please enter a valid domain name." });
    expect(parseDomainInput("")).toEqual({ ok: false, message: "Please enter a valid domain name." });
    expect(parseDomainInput("exa_mple.com")).toEqual({ ok: false, message: "Please enter a valid domain name." });
    expect(parseDomainInput("invalid..com")).toEqual({ ok: false, message: "Please enter a valid domain name." });
  });

  it("rejects blocked TLDs", () => {
    expect(parseDomainInput("foo.local")).toEqual({ ok: false, message: "That domain extension is not supported." });
  });
});

describe("alternativeDomains", () => {
  it("suggests other extensions", () => {
    expect(alternativeDomains("example", "com")).toContain("example.net");
  });
});
