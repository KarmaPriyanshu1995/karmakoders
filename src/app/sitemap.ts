import type { MetadataRoute } from "next";
import { collectSitemapEntries, toMetadataSitemap } from "@/lib/seo/sitemap-builder";
import { getPrimaryTenantId } from "@/lib/tenant-context";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const tenantId = await getPrimaryTenantId();
  const entries = await collectSitemapEntries(tenantId);
  return toMetadataSitemap(entries);
}
