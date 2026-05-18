import { MetadataRoute } from "next";
import { getPages, getPosts, getProjects } from "@/lib/actions";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Use environment variable for base URL, fallback to localhost for development
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://karmakoders.com";

  let pages: any[] = [];
  let posts: any[] = [];
  let projects: any[] = [];

  try {
    // Fetch all dynamic content in parallel, catching individual failures so a single query crash doesn't break the whole sitemap
    const [fetchedPages, fetchedPosts, fetchedProjects] = await Promise.all([
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
    ]);

    pages = fetchedPages || [];
    posts = fetchedPosts || [];
    projects = fetchedProjects || [];
  } catch (error) {
    console.error("Sitemap generation database query failed:", error);
  }

  // Define static routes
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/blog`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/portfolio`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    },
  ];

  // Map dynamic pages
  const dynamicPages: MetadataRoute.Sitemap = pages
    .filter((page) => page?.isPublished && page?.slug)
    .map((page) => ({
      url: `${baseUrl}/${page.slug}`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
    }));

  // Map blog posts and case studies
  const blogRoutes: MetadataRoute.Sitemap = posts
    .filter((post) => post?.published && post?.slug)
    .map((post) => ({
      url: `${baseUrl}/blog/${post.slug}`,
      lastModified: post.createdAt ? new Date(post.createdAt) : new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    }));

  // Map portfolio projects
  const projectRoutes: MetadataRoute.Sitemap = projects
    .filter((project) => project?.slug)
    .map((project) => ({
      url: `${baseUrl}/portfolio/${project.slug}`,
      lastModified: project.createdAt ? new Date(project.createdAt) : new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    }));

  // Combine all routes
  return [...staticRoutes, ...dynamicPages, ...blogRoutes, ...projectRoutes];
}
