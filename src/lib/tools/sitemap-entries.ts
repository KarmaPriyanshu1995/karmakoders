import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

const SITE_URL = "https://www.karmakoders.com";

export async function getFreeToolsSitemapEntries(tenantId: string): Promise<MetadataRoute.Sitemap> {
  const [tools, tlds, comparisons, landings] = await Promise.all([
    prisma.freeTool.findMany({
      where: { tenantId, status: "published", isPublic: true },
      select: { slug: true, toolUrl: true, updatedAt: true },
    }),
    prisma.domainExtension.findMany({
      where: { tenantId, status: "published" },
      select: { tld: true, updatedAt: true },
    }),
    prisma.registrarComparison.findMany({
      where: { tenantId, status: "published" },
      select: { slug: true, updatedAt: true },
    }),
    prisma.seoLandingPage.findMany({
      where: { tenantId, status: "published" },
      select: { slug: true, updatedAt: true },
    }),
  ]);

  const entries: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/free-tools`, changeFrequency: "weekly" },
  ];

  for (const tool of tools) {
    const path = tool.toolUrl || `/free-tools/${tool.slug}`;
    entries.push({ url: `${SITE_URL}${path}`, lastModified: tool.updatedAt, changeFrequency: "weekly" });
  }
  for (const tld of tlds) {
    entries.push({ url: `${SITE_URL}/domains/${tld.tld}`, lastModified: tld.updatedAt, changeFrequency: "weekly" });
  }
  for (const comparison of comparisons) {
    entries.push({ url: `${SITE_URL}/compare/${comparison.slug}`, lastModified: comparison.updatedAt, changeFrequency: "monthly" });
  }
  for (const page of landings) {
    entries.push({ url: `${SITE_URL}/${page.slug}`, lastModified: page.updatedAt, changeFrequency: "monthly" });
  }

  return entries;
}

export function isIndexableStatus(status: string | null | undefined, robots?: string | null): boolean {
  if (status !== "published") return false;
  if (robots && /noindex/i.test(robots)) return false;
  return true;
}
