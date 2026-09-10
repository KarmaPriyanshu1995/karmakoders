import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { buildPageUrl, SITEMAP_EXCLUDED_PAGE_SLUGS } from "@/lib/sitePages";
import { getPrimaryTenantId } from "@/lib/tenant-context";
import { getFreeToolsSitemapEntries } from "@/lib/tools/sitemap-entries";

const SITE_URL = "https://www.karmakoders.com";

// Ensure Google always sees fresh content — this route hits Prisma directly
// (no fetch()/dynamic API), so without this Next.js would render it once at
// build time and never pick up pages/posts/projects/jobs added afterward.
export const dynamic = "force-dynamic";

function isIndexablePostSlug(slug: string): boolean {
  // Leading hyphens are broken SEO slugs (GSC discovered e.g. /-to-build-...).
  return Boolean(slug) && !slug.startsWith("-");
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const tenantId = await getPrimaryTenantId();
  const [pages, posts, projects, jobs, toolEntries] = await Promise.all([
    prisma.page.findMany({
      where: { tenantId, isPublished: true },
      select: { slug: true },
    }),
    prisma.post.findMany({
      where: { tenantId, published: true },
      select: { slug: true, createdAt: true },
    }),
    prisma.project.findMany({
      where: { tenantId },
      select: { slug: true, createdAt: true },
    }),
    prisma.jobOpening.findMany({
      where: { tenantId, isActive: true },
      select: { slug: true, createdAt: true },
    }),
    getFreeToolsSitemapEntries(tenantId),
  ]);

  const pageEntries: MetadataRoute.Sitemap = pages
    .filter((page) => !SITEMAP_EXCLUDED_PAGE_SLUGS.has(page.slug))
    .map((page) => ({
      url: `${SITE_URL}${buildPageUrl(page.slug, "page")}`,
      changeFrequency: "monthly" as const,
    }));

  const postEntries: MetadataRoute.Sitemap = posts
    .filter((post) => isIndexablePostSlug(post.slug))
    .map((post) => ({
      url: `${SITE_URL}${buildPageUrl(post.slug, "post")}`,
      lastModified: post.createdAt,
      changeFrequency: "monthly" as const,
    }));

  // Project details use canonical /portfolio/[slug] (not /projects)
  const projectEntries: MetadataRoute.Sitemap = projects.map((project) => ({
    url: `${SITE_URL}${buildPageUrl(project.slug, "project")}`,
    lastModified: project.createdAt,
    changeFrequency: "monthly" as const,
  }));

  const jobEntries: MetadataRoute.Sitemap = jobs.map((job) => ({
    url: `${SITE_URL}/careers/${job.slug}`,
    lastModified: job.createdAt,
    changeFrequency: "weekly" as const,
  }));

  return [...pageEntries, ...postEntries, ...projectEntries, ...jobEntries, ...toolEntries].filter(
    (entry, index, all) => all.findIndex((item) => item.url === entry.url) === index
  );
}
