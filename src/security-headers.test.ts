import { describe, expect, it } from "vitest";
import nextConfig from "../next.config";

type HeaderRule = { source: string; headers: { key: string; value: string }[] };

async function rules(): Promise<HeaderRule[]> {
  return (await nextConfig.headers!()) as HeaderRule[];
}

const valueOf = (rule: HeaderRule, key: string) =>
  rule.headers.find((h) => h.key.toLowerCase() === key.toLowerCase())?.value;

describe("next.config security headers", () => {
  it("frames are forbidden on every route, pages and APIs alike (catch-all /:path*)", async () => {
    const all = (await rules()).find((r) => r.source === "/:path*");
    expect(all).toBeDefined();
    expect(valueOf(all!, "X-Frame-Options")).toBe("DENY");
    expect(valueOf(all!, "Content-Security-Policy")).toBe("frame-ancestors 'none'");
  });

  it("no later rule overrides frame protection for a page or an API route", async () => {
    for (const rule of await rules()) {
      if (rule.source === "/:path*") continue;
      expect(valueOf(rule, "X-Frame-Options"), rule.source).toBeUndefined();
      expect(valueOf(rule, "Content-Security-Policy"), rule.source).toBeUndefined();
    }
  });

  it("does not send X-Powered-By", () => {
    expect(nextConfig.poweredByHeader).toBe(false);
  });
});
