import { describe, expect, it } from "vitest";
import { allowedOrigins, assertSameOrigin } from "@/platform/security/origin";
import { parseAllowedOriginsExtra } from "@/platform/env/server";

const PROD = { NODE_ENV: "production", APP_URL: "https://www.karmakoders.com", VERCEL_ENV: "production" };
const PREVIEW = {
  NODE_ENV: "production",
  APP_URL: "https://www.karmakoders.com",
  VERCEL_ENV: "preview",
  VERCEL_URL: "karmakoders-abc123-team.vercel.app",
  VERCEL_BRANCH_URL: "karmakoders-git-tool-nda-team.vercel.app",
};
const DEV = { NODE_ENV: "development", APP_URL: "http://localhost:3000" };

const post = (headers: Record<string, string>) =>
  new Request("https://www.karmakoders.com/api/platform/auth/logout", { method: "POST", headers });

describe("allowedOrigins", () => {
  it("production: APP_URL only (no hard-coded staging)", () => {
    expect([...allowedOrigins(PROD)]).toEqual(["https://www.karmakoders.com"]);
  });

  it("preview: adds this deployment's own Vercel URLs only", () => {
    expect(allowedOrigins(PREVIEW)).toEqual(
      new Set([
        "https://www.karmakoders.com",
        "https://karmakoders-abc123-team.vercel.app",
        "https://karmakoders-git-tool-nda-team.vercel.app",
      ])
    );
  });

  it("adds ALLOWED_ORIGINS_EXTRA entries (trimmed, lowercased, empty values ignored)", () => {
    const env = { ...PROD, ALLOWED_ORIGINS_EXTRA: " https://Staging.Example.com , ,https://qa.example.com:8443," };
    expect(allowedOrigins(env)).toEqual(
      new Set(["https://www.karmakoders.com", "https://staging.example.com", "https://qa.example.com:8443"])
    );
  });

  it("localhost:3000 only in development", () => {
    expect(allowedOrigins(DEV).has("http://localhost:3000")).toBe(true);
    expect(allowedOrigins(PROD).has("http://localhost:3000")).toBe(false);
    expect(allowedOrigins({ NODE_ENV: "test" }).has("http://localhost:3000")).toBe(false);
  });
});

describe("assertSameOrigin", () => {
  it("accepts each allowed origin (Request or Headers)", () => {
    expect(() => assertSameOrigin(post({ origin: "https://www.karmakoders.com" }), PROD)).not.toThrow();
    expect(() => assertSameOrigin(new Headers({ origin: "https://karmakoders-abc123-team.vercel.app" }), PREVIEW)).not.toThrow();
    expect(() => assertSameOrigin(post({ origin: "http://localhost:3000" }), DEV)).not.toThrow();
  });

  it("accepts an origin listed in ALLOWED_ORIGINS_EXTRA", () => {
    const env = { ...PROD, ALLOWED_ORIGINS_EXTRA: "https://staging.example.com" };
    expect(() => assertSameOrigin(post({ origin: "https://staging.example.com" }), env)).not.toThrow();
  });

  it("rejects staging.karmakoders.com when it is not listed", () => {
    expect(() => assertSameOrigin(post({ origin: "https://staging.karmakoders.com" }), PROD)).toThrow(
      expect.objectContaining({ status: 403, code: "forbidden" })
    );
  });

  it("falls back to the Referer origin when Origin is absent", () => {
    expect(() => assertSameOrigin(post({ referer: "https://www.karmakoders.com/tools/sign/login" }), PROD)).not.toThrow();
    expect(() => assertSameOrigin(post({ referer: "https://evil.example/page" }), PROD)).toThrow();
  });

  it("rejects foreign origins with 403", () => {
    for (const origin of [
      "https://evil.example",
      "https://www.karmakoders.com.evil.example",
      "https://karmakoders.com", // apex is not APP_URL
      "http://www.karmakoders.com", // wrong scheme
      "https://other-team.vercel.app",
    ]) {
      expect(() => assertSameOrigin(post({ origin }), PREVIEW), origin).toThrow(
        expect.objectContaining({ status: 403, code: "forbidden" })
      );
    }
  });

  it("rejects localhost outside development", () => {
    expect(() => assertSameOrigin(post({ origin: "http://localhost:3000" }), PROD)).toThrow();
  });

  it("rejects a missing or opaque Origin on POST", () => {
    expect(() => assertSameOrigin(post({}), PROD)).toThrow(/origin/i);
    expect(() => assertSameOrigin(post({ origin: "null" }), PROD)).toThrow(/origin/i);
    expect(() => assertSameOrigin(post({ origin: "javascript:alert(1)" }), PROD)).toThrow(/origin/i);
  });
});

describe("parseAllowedOriginsExtra (zod)", () => {
  it("returns [] for unset or empty values", () => {
    expect(parseAllowedOriginsExtra(undefined, "production")).toEqual([]);
    expect(parseAllowedOriginsExtra("", "production")).toEqual([]);
    expect(parseAllowedOriginsExtra(" , ,", "production")).toEqual([]);
  });

  it("allows http only for localhost in development", () => {
    expect(parseAllowedOriginsExtra("http://localhost:4000", "development")).toEqual(["http://localhost:4000"]);
    expect(() => parseAllowedOriginsExtra("http://localhost:4000", "production")).toThrow(/https/);
  });

  it.each([
    ["http://staging.example.com", /must use https/],
    ["https://staging.example.com/path", /origin only/],
    ["https://staging.example.com/", /origin only/],
    ["https://staging.example.com?x=1", /origin only/],
    ["https://user:pw@staging.example.com", /origin only/],
    ["staging.example.com", /not a valid URL/],
    ["ftp://staging.example.com", /must use https/],
  ])("rejects %s with a clear error naming the variable", (entry, message) => {
    expect(() => parseAllowedOriginsExtra(`https://ok.example.com,${entry}`, "production")).toThrow(/ALLOWED_ORIGINS_EXTRA/);
    expect(() => parseAllowedOriginsExtra(entry, "production")).toThrow(message);
  });

  it("an invalid entry makes the origin check fail loudly (500), not silently allow", () => {
    expect(() => allowedOrigins({ ...PROD, ALLOWED_ORIGINS_EXTRA: "http://staging.example.com" })).toThrow(
      /ALLOWED_ORIGINS_EXTRA/
    );
  });
});
