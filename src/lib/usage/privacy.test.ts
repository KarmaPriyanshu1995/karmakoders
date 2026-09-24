import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { classifyChannel, geoFromHeaders, hashVisitor, sanitizeUsagePayload } from "@/lib/usage/privacy";
import { fillDailySeries, parseUsageFilters } from "@/lib/usage/series";
import { parseToolContent, toolSeoScore } from "@/lib/tools/content";
import { webApplicationJsonLd } from "@/lib/tools/jsonld";
import { resolveIndexNowKey } from "@/lib/seo/indexnow-key";

describe("usage privacy", () => {
  it("hashes visitor tokens without keeping the raw value", () => {
    const hashed = hashVisitor("abc12345token", "salt");
    expect(hashed).toHaveLength(32);
    expect(hashed).not.toContain("abc12345");
    expect(hashVisitor("abc12345token", "salt")).toBe(hashed);
    expect(hashVisitor("abc12345token", "other")).not.toBe(hashed);
  });

  it("classifies acquisition channels from the referrer host only", () => {
    expect(classifyChannel("", "www.karmakoders.com").channel).toBe("direct");
    expect(classifyChannel("https://www.karmakoders.com/free-tools", "karmakoders.com").channel).toBe("direct");
    expect(classifyChannel("https://www.google.com/search?q=secret", "karmakoders.com")).toEqual({
      channel: "organic",
      host: "google.com",
    });
    expect(classifyChannel("https://t.co/abc", "karmakoders.com").channel).toBe("social");
    expect(classifyChannel("https://news.example.com/story?token=1", "karmakoders.com")).toEqual({
      channel: "referral",
      host: "news.example.com",
    });
  });

  it("reads country and city from edge headers and ignores client-supplied geo", () => {
    const headers = new Headers({
      "cf-ipcountry": "us",
      "x-vercel-ip-city": "San%20Francisco",
    });
    expect(geoFromHeaders(headers)).toEqual({ country: "US", city: "San Francisco" });
    expect(geoFromHeaders(new Headers({ "cf-ipcountry": "XX" }))).toEqual({ country: "", city: "" });
  });

  it("rejects malformed events and strips tool input from the payload", () => {
    expect(sanitizeUsagePayload({ t: "click", tool: "domain-compare", v: "abcdefgh" })).toBeNull();
    const parsed = sanitizeUsagePayload({
      t: "execute",
      tool: "Domain Compare!",
      v: "visitor_123",
      r: 1,
      d: "mobile",
      b: "Firefox",
      ref: "https://www.google.com/search?q=private",
      ms: 4200,
      domain: "should-not-matter.example",
    });
    expect(parsed).toMatchObject({
      event: "execute",
      tool: "domaincompare",
      returning: true,
      device: "mobile",
      browser: "Firefox",
      durationMs: 4200,
    });
    expect(JSON.stringify(parsed)).not.toContain("should-not-matter");
  });

  it("keeps the tracker script under 10KB", () => {
    const file = readFileSync(path.join(process.cwd(), "public/k.js"));
    expect(file.byteLength).toBeLessThan(10 * 1024);
  });
});

describe("usage series", () => {
  it("fills missing days and caps the selected range", () => {
    const filters = parseUsageFilters(
      { from: "2026-09-01", to: "2026-09-03", tool: "Compress Image", country: "us", channel: "organic" },
      new Date("2026-09-24T00:00:00.000Z")
    );
    expect(filters.tool).toBe("compressimage");
    expect(filters.country).toBe("US");
    expect(filters.channel).toBe("organic");
    expect(filters.to.toISOString().slice(0, 10)).toBe("2026-09-04");
    const series = fillDailySeries([{ day: "2026-09-02", views: 4, executes: 1 }], filters.from, new Date("2026-09-03T00:00:00.000Z"));
    expect(series.map((point) => point.day)).toEqual(["2026-09-01", "2026-09-02", "2026-09-03"]);
    expect(series[1]).toEqual({ day: "2026-09-02", views: 4, executes: 1 });
    expect(series[0].views).toBe(0);
  });
});

describe("tool seo", () => {
  it("parses headings, intro copy, and FAQ entries", () => {
    const content = parseToolContent(
      JSON.stringify({
        heroHeading: "Compress images",
        h2: "How it works",
        introAbove: "Drop a file.",
        introBelow: "Nothing is uploaded.",
        faq: [{ question: "Is it free?", answer: "Yes." }, { question: "", answer: "no" }],
      })
    );
    expect(content.h2).toBe("How it works");
    expect(content.faq).toEqual([{ question: "Is it free?", answer: "Yes." }]);
  });

  it("scores missing on-page fields and emits the selected schema type", () => {
    const health = toolSeoScore({
      seoTitle: "Free image compressor for JPG PNG and WebP files",
      seoDescription: "Compress JPG, PNG, and WebP images in the browser. Files stay on your device and are never uploaded.",
      seoKeywords: "image compressor",
      canonicalUrl: "https://www.karmakoders.com/free-tools/compress-image",
      ogImage: "https://cdn.example/og.png",
      schemaType: "SoftwareApplication",
      contentJson: JSON.stringify({
        heroHeading: "Free image compressor",
        h2: "Private compression",
        introAbove: "Runs locally.",
        faq: [{ question: "Is it free?", answer: "Yes." }],
      }),
    });
    expect(health.score).toBe(100);
    expect(health.missing).toEqual([]);
    expect(webApplicationJsonLd({ name: "Compressor", description: "Shrink images", url: "/free-tools/compress-image", schemaType: "SoftwareApplication" })["@type"]).toBe(
      "SoftwareApplication"
    );
  });

  it("derives a stable IndexNow key when one is not configured", () => {
    const key = resolveIndexNowKey({ NEXTAUTH_SECRET: "test-secret" } as unknown as NodeJS.ProcessEnv);
    expect(key).toMatch(/^[a-f0-9]{32,128}$/);
    expect(resolveIndexNowKey({ INDEXNOW_KEY: "published-key" } as unknown as NodeJS.ProcessEnv)).toBe("published-key");
  });
});
