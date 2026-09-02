import type { MetadataRoute } from "next";
import { collectSitemapEntries, toMetadataSitemap } from "@/lib/seo/sitemap-builder";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries = await collectSitemapEntries();
  return toMetadataSitemap(entries);
}
