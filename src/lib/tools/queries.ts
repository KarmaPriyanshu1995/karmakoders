import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { getPrimaryTenantId } from "@/lib/tenant-context";
import { ensureFreeToolsDefaults } from "@/lib/tools/defaults";

const ensureDefaults = cache(ensureFreeToolsDefaults);

export const getPublishedTools = cache(async () => {
  const tenantId = await getPrimaryTenantId();
  await ensureDefaults(tenantId);
  return prisma.freeTool.findMany({
    where: { tenantId, status: "published", isPublic: true },
    include: { category: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
});

export const getPublishedToolBySlug = cache(async (slug: string) => {
  const tenantId = await getPrimaryTenantId();
  await ensureDefaults(tenantId);
  return prisma.freeTool.findFirst({
    where: { tenantId, slug, status: "published", isPublic: true },
    include: { category: true },
  });
});

export const getToolCategories = cache(async () => {
  const tenantId = await getPrimaryTenantId();
  await ensureDefaults(tenantId);
  return prisma.toolCategory.findMany({
    where: { tenantId },
    orderBy: { sortOrder: "asc" },
  });
});

export const getPublishedTld = cache(async (tld: string) => {
  const tenantId = await getPrimaryTenantId();
  const normalized = tld.replace(/^\./, "").toLowerCase();
  return prisma.domainExtension.findFirst({
    where: { tenantId, tld: normalized, status: "published" },
  });
});

export const getPublishedComparison = cache(async (slug: string) => {
  const tenantId = await getPrimaryTenantId();
  return prisma.registrarComparison.findFirst({
    where: { tenantId, slug, status: "published" },
    include: { providerA: true, providerB: true },
  });
});

export const getPublishedSeoLandingPage = cache(async (slug: string) => {
  const tenantId = await getPrimaryTenantId();
  return prisma.seoLandingPage.findFirst({
    where: { tenantId, slug, status: "published" },
  });
});

export async function getLatestTldPrices(tenantId: string, tld: string) {
  const providers = await prisma.domainProvider.findMany({
    where: { tenantId, status: "active" },
    orderBy: { priority: "asc" },
    select: { id: true, name: true, slug: true },
  });
  const prices = await Promise.all(
    providers.map(async (provider) => {
      const latest = await prisma.domainPrice.findFirst({
        where: { tenantId, providerId: provider.id, tld },
        orderBy: { capturedAt: "desc" },
      });
      return { provider, latest };
    })
  );
  return prices;
}
