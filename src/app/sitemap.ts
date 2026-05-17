import { MetadataRoute } from "next";
import { getPages, getPosts, getProjects } from "@/lib/actions";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Use environment variable for base URL, fallback to localhost for development
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://karmakoders.com";

  // Fetch all dynamic content in parallel
  const [pages, posts, projects] = await Promise.all([
    getPages(),
    getPosts(),
    getProjects(),
  ]);

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
    .filter((page) => page.isPublished)
    .map((page) => ({
      url: `${baseUrl}/${page.slug}`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
    }));

  // Map blog posts and case studies
  const blogRoutes: MetadataRoute.Sitemap = posts
    .filter((post) => post.published)
    .map((post) => ({
      url: `${baseUrl}/blog/${post.slug}`,
      lastModified: post.createdAt,
      changeFrequency: "weekly",
      priority: 0.8,
    }));

  // Map portfolio projects
  const projectRoutes: MetadataRoute.Sitemap = projects.map((project) => ({
    url: `${baseUrl}/portfolio/${project.slug}`,
    lastModified: project.createdAt,
    changeFrequency: "monthly",
    priority: 0.8,
  }));

  // Combine all routes
  return [...staticRoutes, ...dynamicPages, ...blogRoutes, ...projectRoutes];
}
