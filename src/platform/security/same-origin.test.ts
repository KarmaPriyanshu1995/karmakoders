import { describe, expect, it } from "vitest";
import { assertSameOrigin } from "@/platform/security/same-origin";

const h = (init: Record<string, string>) => new Headers(init);

describe("assertSameOrigin", () => {
  it("accepts an Origin matching the request host", () => {
    expect(() => assertSameOrigin(h({ origin: "https://www.karmakoders.com", host: "www.karmakoders.com" }), {})).not.toThrow();
    expect(() => assertSameOrigin(h({ origin: "http://localhost:3000", host: "localhost:3000" }), {})).not.toThrow();
  });

  it("prefers x-forwarded-host (Vercel)", () => {
    expect(() =>
      assertSameOrigin(
        h({ origin: "https://www.karmakoders.com", host: "internal:3000", "x-forwarded-host": "www.karmakoders.com" }),
        {}
      )
    ).not.toThrow();
  });

  it("accepts the configured APP_URL origin", () => {
    expect(() =>
      assertSameOrigin(h({ origin: "https://www.karmakoders.com", host: "preview.vercel.app" }), {
        APP_URL: "https://www.karmakoders.com",
      })
    ).not.toThrow();
  });

  it("rejects a cross-site Origin with 403", () => {
    expect(() => assertSameOrigin(h({ origin: "https://evil.example", host: "www.karmakoders.com" }), {})).toThrow(
      expect.objectContaining({ status: 403, code: "forbidden" })
    );
  });

  it("rejects a missing or malformed Origin", () => {
    expect(() => assertSameOrigin(h({ host: "www.karmakoders.com" }), {})).toThrow(/origin/i);
    expect(() => assertSameOrigin(h({ origin: "null", host: "www.karmakoders.com" }), {})).toThrow(/origin/i);
  });

  it("does not treat a lookalike subdomain as same-origin", () => {
    expect(() =>
      assertSameOrigin(h({ origin: "https://www.karmakoders.com.evil.example", host: "www.karmakoders.com" }), {})
    ).toThrow();
  });
});
