import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  collectSitemapEntries,
  SITE_URL,
  toSitemapXml,
} from "@/lib/seo/sitemap-builder";
import { crawlPaths } from "@/lib/seo/site-crawler";
import { getContextualTenantId } from "@/lib/tenant-context";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const tenantId = await getContextualTenantId();
    const entries = await collectSitemapEntries(tenantId);
    return NextResponse.json({
      siteUrl: SITE_URL,
      sitemapUrl: `${SITE_URL}/sitemap.xml`,
      gscSitemapUrl: `https://search.google.com/search-console/sitemaps?resource_id=${encodeURIComponent(SITE_URL)}`,
      totalUrls: entries.length,
      entries,
    });
  } catch (error) {
    console.error("[sitemap-crawl GET]", error);
    return NextResponse.json({ error: "Failed to build sitemap list" }, { status: 500 });
  }
}

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const tenantId = await getContextualTenantId();
    const entries = await collectSitemapEntries(tenantId);
    const paths = entries.map((e) => e.path);
    const results = await crawlPaths(SITE_URL, paths);

    const issueCount = results.reduce((sum, r) => sum + r.issues.length, 0);
    const criticalCount = results.reduce(
      (sum, r) => sum + r.issues.filter((i) => i.severity === "critical").length,
      0
    );
    const okCount = results.filter((r) => r.ok && r.issues.every((i) => i.severity !== "critical")).length;

    return NextResponse.json({
      siteUrl: SITE_URL,
      sitemapUrl: `${SITE_URL}/sitemap.xml`,
      gscSitemapUrl: `https://search.google.com/search-console/sitemaps?resource_id=${encodeURIComponent(SITE_URL)}`,
      crawledAt: new Date().toISOString(),
      summary: {
        total: results.length,
        ok: okCount,
        withIssues: results.filter((r) => r.issues.length > 0).length,
        criticalIssues: criticalCount,
        totalIssues: issueCount,
      },
      entries,
      results,
      xmlPreview: toSitemapXml(entries).slice(0, 8000),
    });
  } catch (error) {
    console.error("[sitemap-crawl POST]", error);
    return NextResponse.json({ error: "Crawl failed" }, { status: 500 });
  }
}
