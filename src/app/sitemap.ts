import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { buildPageUrl } from "@/lib/sitePages";

const SITE_URL = "https://www.karmakoders.com";

// Ensure Google always sees fresh content — this route hits Prisma directly
// (no fetch()/dynamic API), so without this Next.js would render it once at
// build time and never pick up pages/posts/projects/jobs added afterward.
export const dynamic = "force-dynamic";

// Real routes that aren't backed by a CMS Page record, so they can't be
// discovered via the prisma.page query below.
const STATIC_ENTRIES: MetadataRoute.Sitemap = [
  { url: `${SITE_URL}/projects`, changeFrequency: "weekly" },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [pages, posts, projects, jobs] = await Promise.all([
    prisma.page.findMany({
      where: { isPublished: true },
      select: { slug: true },
    }),
    prisma.post.findMany({
      where: { published: true },
      select: { slug: true, createdAt: true },
    }),
    prisma.project.findMany({
      select: { slug: true, createdAt: true },
    }),
    prisma.jobOpening.findMany({
      where: { isActive: true },
      select: { slug: true, createdAt: true },
    }),
  ]);

  const pageEntries: MetadataRoute.Sitemap = pages.map((page) => ({
    url: `${SITE_URL}${buildPageUrl(page.slug, "page")}`,
    changeFrequency: "monthly",
  }));

  const postEntries: MetadataRoute.Sitemap = posts.map((post) => ({
    url: `${SITE_URL}${buildPageUrl(post.slug, "post")}`,
    lastModified: post.createdAt,
    changeFrequency: "monthly",
  }));

  const projectEntries: MetadataRoute.Sitemap = projects.map((project) => ({
    url: `${SITE_URL}${buildPageUrl(project.slug, "project")}`,
    lastModified: project.createdAt,
    changeFrequency: "monthly",
  }));

  const jobEntries: MetadataRoute.Sitemap = jobs.map((job) => ({
    url: `${SITE_URL}/careers/${job.slug}`,
    lastModified: job.createdAt,
    changeFrequency: "weekly",
  }));

  return [...STATIC_ENTRIES, ...pageEntries, ...postEntries, ...projectEntries, ...jobEntries];
}
