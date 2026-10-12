import { describe, expect, it } from "vitest";
import { buildLoginHref, safeNextPath } from "@/platform/auth/redirect";

const DEFAULT = "/tools/sign/dashboard";

describe("safeNextPath", () => {
  it.each([
    "//evil.com",
    "https://evil.com",
    "/\\evil.com",
    "%2F%2Fevil.com",
    "javascript:alert(1)",
    // extra variants
    "/%2F/evil.com",
    "%252F%252Fevil.com",
    "\\\\evil.com",
    "/tools/sign/../../admin",
    "/tools/sign/%2e%2e/%2e%2e/admin",
    "http://www.karmakoders.com/tools/sign/dashboard",
    "data:text/html,<script>alert(1)</script>",
    "/tools/sign\\..\\admin",
    "/tools/sign/\u0000x",
    "/tools/signx",
    "/admin",
    "/tools/sign/login",
    "/tools/sign/login?next=//evil.com",
    "%",
    "",
    // A fully encoded path is rejected too (Next.js already decodes searchParams once).
    "%2Ftools%2Fsign%2Fbilling",
  ])("rejects %j", (next) => {
    expect(safeNextPath(next)).toBe(DEFAULT);
  });

  it("rejects non-strings", () => {
    expect(safeNextPath(null)).toBe(DEFAULT);
    expect(safeNextPath(undefined)).toBe(DEFAULT);
  });

  it.each([
    ["/tools/sign/documents/abc", "/tools/sign/documents/abc"],
    ["/tools/sign/new/mutual-nda?x=1", "/tools/sign/new/mutual-nda?x=1"],
    ["/tools/sign/dashboard", "/tools/sign/dashboard"],
  ])("accepts %j", (next, expected) => {
    expect(safeNextPath(next)).toBe(expected);
  });
});

describe("buildLoginHref", () => {
  it("encodes a safe next", () => {
    expect(buildLoginHref("/tools/sign/documents/abc")).toBe("/tools/sign/login?next=%2Ftools%2Fsign%2Fdocuments%2Fabc");
  });

  it("falls back to the dashboard for unsafe paths", () => {
    expect(buildLoginHref("//evil.com")).toBe("/tools/sign/login?next=%2Ftools%2Fsign%2Fdashboard");
  });
});
