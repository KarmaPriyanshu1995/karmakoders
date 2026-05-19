import { MetadataRoute } from "next";
import { getPages, getPosts, getProjects, getJobs } from "@/lib/actions";

export const dynamic = "force-dynamic";
export const revalidate = 3600; // Cache sitemap for 1 hour to optimize performance and database load

// Helper function to safely construct and sanitize URLs, preventing double slashes
function sanitizeUrl(baseUrl: string, ...paths: string[]): string {
  const cleanPaths = paths
    .map((p) => p.toString().trim().replace(/^\/+|\/+$/g, "")) // Remove leading and trailing slashes
    .filter(Boolean); // Filter out empty parts
  return [baseUrl.replace(/\/+$/, ""), ...cleanPaths].join("/");
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://karmakoders.xyz";

  let pages: any[] = [];
  let posts: any[] = [];
  let projects: any[] = [];
  let jobs: any[] = [];

  try {
    // Fetch all dynamic content in parallel, catching individual failures so a single query crash doesn't break the whole sitemap
    const [fetchedPages, fetchedPosts, fetchedProjects, fetchedJobs] = await Promise.all([
      getPages().catch((err) => {
        console.error("Sitemap: Failed to fetch pages:", err);
        return [];
      }),
      getPosts().catch((err) => {
        console.error("Sitemap: Failed to fetch posts:", err);
        return [];
      }),
      getProjects().catch((err) => {
        console.error("Sitemap: Failed to fetch projects:", err);
        return [];
      }),
      getJobs().catch((err) => {
        console.error("Sitemap: Failed to fetch jobs:", err);
        return [];
      }),
    ]);

    pages = fetchedPages || [];
    posts = fetchedPosts || [];
    projects = fetchedProjects || [];
    jobs = fetchedJobs || [];
  } catch (error) {
    console.error("Sitemap generation database query failed:", error);
  }

  // 1. Define Static/Core Routes (all the built-in pages)
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: sanitizeUrl(baseUrl, "about"),
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: sanitizeUrl(baseUrl, "services"),
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: sanitizeUrl(baseUrl, "portfolio"),
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: sanitizeUrl(baseUrl, "projects"),
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: sanitizeUrl(baseUrl, "case-studies"),
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: sanitizeUrl(baseUrl, "blog"),
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: sanitizeUrl(baseUrl, "careers"),
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: sanitizeUrl(baseUrl, "contact"),
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
  ];

  // 2. Map dynamic pages from database (e.g. customized terms, privacy, help-center)
  const dynamicPages: MetadataRoute.Sitemap = pages
    .filter((page) => page?.isPublished && page?.slug)
    .map((page) => ({
      url: sanitizeUrl(baseUrl, page.slug),
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
    }));

  // 3. Map blog posts and case studies from database
  const blogRoutes: MetadataRoute.Sitemap = posts
    .filter((post) => post?.published && post?.slug)
    .map((post) => ({
      // Although type can be "case-study", in this routing structure both map to /blog/[slug]
      url: sanitizeUrl(baseUrl, "blog", post.slug),
      lastModified: post.createdAt ? new Date(post.createdAt) : new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    }));

  // 4. Map portfolio projects from database
  const projectRoutes: MetadataRoute.Sitemap = projects
    .filter((project) => project?.slug)
    .map((project) => ({
      url: sanitizeUrl(baseUrl, "portfolio", project.slug),
      lastModified: project.createdAt ? new Date(project.createdAt) : new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    }));

  // 5. Map active career jobs from database
  const jobRoutes: MetadataRoute.Sitemap = jobs
    .filter((job) => job?.isActive && job?.slug)
    .map((job) => ({
      url: sanitizeUrl(baseUrl, "careers", job.slug),
      lastModified: job.createdAt ? new Date(job.createdAt) : new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
    }));

  // Combine all routes
  const allRoutes = [
    ...staticRoutes,
    ...dynamicPages,
    ...blogRoutes,
    ...projectRoutes,
    ...jobRoutes,
  ];

  // Remove any duplicates to ensure unique, valid URLs (e.g. if a slug is "/" or already exists in staticRoutes)
  const uniqueRoutesMap = new Map<string, typeof allRoutes[number]>();
  for (const route of allRoutes) {
    uniqueRoutesMap.set(route.url, route);
  }

  return Array.from(uniqueRoutesMap.values());
}
