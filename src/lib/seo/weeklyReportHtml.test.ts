import { describe, expect, it } from "vitest";
import { authorizeCronRequest } from "./cronAuth";
import { isWeeklyReportsEnabled, parseSeoSettings } from "./seoSettings";
import { parseWeeklyReportSummary, renderWeeklyReportHtml } from "./weeklyReportHtml";

describe("seoSettings", () => {
  it("defaults weekly reports on and rejects unknown locales", () => {
    const settings = parseSeoSettings({ weeklyReports: false, defaultLocale: "xx", schemaAutoApply: true });
    expect(settings.weeklyReports).toBe(false);
    expect(settings.defaultLocale).toBe("en");
    expect(settings.schemaAutoApply).toBe(true);
    expect(isWeeklyReportsEnabled(settings)).toBe(false);
    expect(isWeeklyReportsEnabled(parseSeoSettings(null))).toBe(true);
  });
});

describe("weeklyReportHtml", () => {
  it("renders printable HTML with escaped titles and scores", () => {
    const summary = parseWeeklyReportSummary({
      scores: { overall: 72, technical: 80, content: 61, entity: 40, internalLink: 55, schema: 20, ctr: 33 },
      audit: { totalPages: 12, indexedPages: 10, missingTitles: 2, issuesCount: 4, orphanPages: 1 },
      searchConsole: { clicks: 140, impressions: 2000, ctr: 0.07, position: 8.2 },
      generatedAt: "2026-09-21T00:00:00.000Z",
    });
    const html = renderWeeklyReportHtml({
      title: `Weekly <script>alert(1)</script>`,
      brandName: "Karmakoders",
      summary,
    });
    expect(html).toContain("Weekly");
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("72");
    expect(html).toContain("Missing titles: 2");
    expect(html).toContain("Clicks");
    expect(html).toContain("@media print");
  });
});

describe("cronAuth", () => {
  it("accepts bearer or x-cron-secret when CRON_SECRET is set", () => {
    const previous = process.env.CRON_SECRET;
    process.env.CRON_SECRET = "weekly-secret";
    try {
      expect(authorizeCronRequest(new Request("https://example.com", { headers: { authorization: "Bearer weekly-secret" } }))).toBe(true);
      expect(authorizeCronRequest(new Request("https://example.com", { headers: { "x-cron-secret": "weekly-secret" } }))).toBe(true);
      expect(authorizeCronRequest(new Request("https://example.com"))).toBe(false);
    } finally {
      if (previous === undefined) delete process.env.CRON_SECRET;
      else process.env.CRON_SECRET = previous;
    }
  });
});
