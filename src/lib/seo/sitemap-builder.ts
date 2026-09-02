import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { buildPageUrl, SITE_PAGES } from "@/lib/sitePages";

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://www.karmakoders.com";

/** Static tool routes not backed by CMS Page records. */
const STATIC_TOOL_PATHS = ["/free-tools", "/free-tools/domain-compare"];

export interface SitemapUrlEntry {
  path: string;
  url: string;
  source: string;
  changeFrequency?: MetadataRoute.Sitemap[0]["changeFrequency"];
  lastModified?: Date;
  priority?: number;
}

function entry(
  path: string,
  source: string,
  opts?: { changeFrequency?: SitemapUrlEntry["changeFrequency"]; lastModified?: Date; priority?: number }
): SitemapUrlEntry {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return {
    path: normalized,
    url: `${SITE_URL}${normalized === "/" ? "" : normalized}`,
    source,
    changeFrequency: opts?.changeFrequency,
    lastModified: opts?.lastModified,
    priority: opts?.priority,
  };
}

/** Collect every indexable public URL from the database. */
export async function collectSitemapEntries(): Promise<SitemapUrlEntry[]> {
  const [pages, posts, projects, jobs] = await Promise.all([
    prisma.page.findMany({ where: { isPublished: true }, select: { slug: true } }),
    prisma.post.findMany({ where: { published: true }, select: { slug: true, createdAt: true } }),
    prisma.project.findMany({ select: { slug: true, createdAt: true } }),
    prisma.jobOpening.findMany({ where: { isActive: true }, select: { slug: true, createdAt: true } }),
  ]);

  const entries: SitemapUrlEntry[] = [];

  for (const page of SITE_PAGES) {
    const path = buildPageUrl(page.slug, "page");
    entries.push(
      entry(path, "site-page", {
        changeFrequency: page.slug === "blog" ? "weekly" : "monthly",
        priority: page.slug === "home" ? 1 : 0.8,
      })
    );
  }

  entries.push(entry("/projects", "static", { changeFrequency: "weekly", priority: 0.7 }));

  for (const toolPath of STATIC_TOOL_PATHS) {
    entries.push(entry(toolPath, "static", { changeFrequency: "weekly", priority: 0.85 }));
  }

  for (const page of pages) {
    if (SITE_PAGES.some((s) => s.slug === page.slug)) continue;
    entries.push(entry(buildPageUrl(page.slug, "page"), "cms-page", { changeFrequency: "monthly" }));
  }

  for (const post of posts) {
    entries.push(
      entry(buildPageUrl(post.slug, "post"), "blog", {
        changeFrequency: "monthly",
        lastModified: post.createdAt,
        priority: 0.7,
      })
    );
  }

  for (const project of projects) {
    entries.push(
      entry(buildPageUrl(project.slug, "project"), "portfolio", {
        changeFrequency: "monthly",
        lastModified: project.createdAt,
        priority: 0.6,
      })
    );
  }

  for (const job of jobs) {
    entries.push(
      entry(`/careers/${job.slug}`, "careers", {
        changeFrequency: "weekly",
        lastModified: job.createdAt,
        priority: 0.5,
      })
    );
  }

  const seen = new Set<string>();
  return entries.filter((item) => {
    if (seen.has(item.path)) return false;
    seen.add(item.path);
    return true;
  });
}

export function toMetadataSitemap(entries: SitemapUrlEntry[]): MetadataRoute.Sitemap {
  return entries.map((item) => ({
    url: item.url,
    lastModified: item.lastModified,
    changeFrequency: item.changeFrequency,
    priority: item.priority,
  }));
}

export function toSitemapXml(entries: SitemapUrlEntry[]): string {
  const urls = entries
    .map((item) => {
      const lastmod = item.lastModified ? `\n    <lastmod>${item.lastModified.toISOString()}</lastmod>` : "";
      const freq = item.changeFrequency ? `\n    <changefreq>${item.changeFrequency}</changefreq>` : "";
      const priority = item.priority != null ? `\n    <priority>${item.priority.toFixed(1)}</priority>` : "";
      return `  <url>\n    <loc>${escapeXml(item.url)}</loc>${lastmod}${freq}${priority}\n  </url>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`;
}

function escapeXml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
