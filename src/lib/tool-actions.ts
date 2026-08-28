"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireTenantContext, TenantAccessError } from "@/lib/tenant-context";
import { assertPermission, PERMISSIONS } from "@/lib/permissions";
import { AUDIT_ACTIONS, logAudit } from "@/lib/audit";
import { ensureFreeToolsDefaults } from "@/lib/tools/defaults";
import { getFreeToolsSettings, saveFreeToolsSettings, parseFreeToolsSettings, type FreeToolsSettings } from "@/lib/tools/settings";
import { isSafeRedirectUrl } from "@/lib/tools/affiliate";

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

async function requireTools(permission: typeof PERMISSIONS.TOOLS_VIEW | typeof PERMISSIONS.TOOLS_CREATE | typeof PERMISSIONS.TOOLS_UPDATE | typeof PERMISSIONS.TOOLS_DELETE) {
  const ctx = await requireTenantContext();
  assertPermission(ctx.role, permission, ctx.permissionOverrides);
  await ensureFreeToolsDefaults(ctx.tenantId);
  return ctx;
}

function revalidateTools(slug?: string) {
  revalidatePath("/admin/tools");
  revalidatePath("/free-tools");
  revalidatePath("/sitemap.xml");
  if (slug) {
    revalidatePath(`/free-tools/${slug}`);
    revalidatePath(`/admin/tools/${slug}`);
  }
}

export async function getToolsAdmin() {
  const { tenantId } = await requireTools(PERMISSIONS.TOOLS_VIEW);
  const [tools, counts] = await Promise.all([
    prisma.freeTool.findMany({
      where: { tenantId },
      include: { category: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    prisma.freeTool.groupBy({
      by: ["status"],
      where: { tenantId },
      _count: { _all: true },
    }),
  ]);
  const stats = { total: tools.length, published: 0, draft: 0, archived: 0 };
  for (const row of counts) {
    if (row.status === "published") stats.published = row._count._all;
    if (row.status === "draft") stats.draft = row._count._all;
    if (row.status === "archived") stats.archived = row._count._all;
  }
  return { tools, stats };
}

export async function getToolAdminBySlug(slug: string) {
  const { tenantId } = await requireTools(PERMISSIONS.TOOLS_VIEW);
  return prisma.freeTool.findFirst({
    where: { tenantId, slug },
    include: { category: true },
  });
}

export async function getToolCategoriesAdmin() {
  const { tenantId } = await requireTools(PERMISSIONS.TOOLS_VIEW);
  return prisma.toolCategory.findMany({ where: { tenantId }, orderBy: { sortOrder: "asc" } });
}

export async function upsertToolCategory(data: { id?: string; name: string; slug?: string; sortOrder?: number }) {
  const { tenantId, user } = await requireTools(PERMISSIONS.TOOLS_UPDATE);
  const slug = slugify(data.slug || data.name);
  if (!slug || !data.name.trim()) throw new TenantAccessError("Name is required");
  const category = data.id
    ? await prisma.toolCategory.update({
        where: { id: data.id },
        data: { name: data.name.trim(), slug, sortOrder: data.sortOrder ?? 0 },
      })
    : await prisma.toolCategory.create({
        data: { tenantId, name: data.name.trim(), slug, sortOrder: data.sortOrder ?? 0 },
      });
  await logAudit({ tenantId, userId: user.id, action: AUDIT_ACTIONS.TOOL_UPDATED, resource: "tool_category", resourceId: category.id });
  revalidateTools();
  return category;
}

export async function deleteToolCategory(id: string) {
  const { tenantId, user } = await requireTools(PERMISSIONS.TOOLS_DELETE);
  const { count } = await prisma.toolCategory.deleteMany({ where: { id, tenantId } });
  if (count === 0) throw new TenantAccessError("Not found");
  await logAudit({ tenantId, userId: user.id, action: AUDIT_ACTIONS.TOOL_DELETED, resource: "tool_category", resourceId: id });
  revalidateTools();
}

export interface ToolInput {
  id?: string;
  name: string;
  slug?: string;
  shortDescription: string;
  longDescription?: string;
  icon?: string;
  categoryId?: string | null;
  status?: string;
  isFeatured?: boolean;
  isPublic?: boolean;
  sortOrder?: number;
  toolUrl?: string;
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string;
  canonicalUrl?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  robots?: string;
  contentJson?: string;
}

export async function upsertTool(data: ToolInput) {
  const { tenantId, user } = await requireTools(data.id ? PERMISSIONS.TOOLS_UPDATE : PERMISSIONS.TOOLS_CREATE);
  const slug = slugify(data.slug || data.name);
  if (!data.name.trim() || !slug) throw new TenantAccessError("Name and slug are required");
  const status = ["draft", "published", "archived"].includes(data.status || "") ? data.status! : "draft";

  const payload = {
    name: data.name.trim(),
    slug,
    shortDescription: data.shortDescription.trim(),
    longDescription: data.longDescription?.trim() || "",
    icon: data.icon?.trim() || null,
    categoryId: data.categoryId || null,
    status,
    isFeatured: Boolean(data.isFeatured),
    isPublic: data.isPublic !== false,
    sortOrder: data.sortOrder ?? 0,
    toolUrl: data.toolUrl?.trim() || `/free-tools/${slug}`,
    seoTitle: data.seoTitle?.trim() || null,
    seoDescription: data.seoDescription?.trim() || null,
    seoKeywords: data.seoKeywords?.trim() || null,
    canonicalUrl: data.canonicalUrl?.trim() || null,
    ogTitle: data.ogTitle?.trim() || null,
    ogDescription: data.ogDescription?.trim() || null,
    ogImage: data.ogImage?.trim() || null,
    robots: data.robots?.trim() || "index,follow",
    contentJson: data.contentJson || null,
  };

  let previousStatus: string | null = null;
  if (data.id) {
    const existing = await prisma.freeTool.findFirst({ where: { id: data.id, tenantId } });
    if (!existing) throw new TenantAccessError("Not found");
    previousStatus = existing.status;
  }

  const tool = data.id
    ? await prisma.freeTool.update({ where: { id: data.id }, data: payload })
    : await prisma.freeTool.create({ data: { ...payload, tenantId } });

  if (!data.id) {
    await logAudit({ tenantId, userId: user.id, action: AUDIT_ACTIONS.TOOL_CREATED, resource: "tool", resourceId: tool.id });
  } else {
    await logAudit({
      tenantId,
      userId: user.id,
      action: previousStatus !== status
        ? status === "published"
          ? AUDIT_ACTIONS.TOOL_PUBLISHED
          : status === "archived"
            ? AUDIT_ACTIONS.TOOL_ARCHIVED
            : AUDIT_ACTIONS.TOOL_UNPUBLISHED
        : AUDIT_ACTIONS.TOOL_UPDATED,
      resource: "tool",
      resourceId: tool.id,
    });
    if (data.seoTitle !== undefined || data.seoDescription !== undefined) {
      await logAudit({ tenantId, userId: user.id, action: AUDIT_ACTIONS.TOOL_SEO_CHANGED, resource: "tool", resourceId: tool.id });
    }
  }

  revalidateTools(tool.slug);
  return tool;
}

export async function duplicateTool(id: string) {
  const { tenantId, user } = await requireTools(PERMISSIONS.TOOLS_CREATE);
  const source = await prisma.freeTool.findFirst({ where: { id, tenantId } });
  if (!source) throw new TenantAccessError("Not found");
  let slug = `${source.slug}-copy`;
  let n = 2;
  while (await prisma.freeTool.findFirst({ where: { tenantId, slug } })) {
    slug = `${source.slug}-copy-${n++}`;
  }
  const copy = await prisma.freeTool.create({
    data: {
      tenantId,
      name: `${source.name} (copy)`,
      slug,
      shortDescription: source.shortDescription,
      longDescription: source.longDescription,
      icon: source.icon,
      categoryId: source.categoryId,
      status: "draft",
      isFeatured: false,
      isPublic: source.isPublic,
      sortOrder: source.sortOrder + 1,
      toolUrl: `/free-tools/${slug}`,
      seoTitle: source.seoTitle,
      seoDescription: source.seoDescription,
      seoKeywords: source.seoKeywords,
      robots: "noindex,follow",
      contentJson: source.contentJson,
    },
  });
  await logAudit({ tenantId, userId: user.id, action: AUDIT_ACTIONS.TOOL_CREATED, resource: "tool", resourceId: copy.id, metadata: { duplicatedFrom: id } });
  revalidateTools();
  return copy;
}

export async function updateToolStatus(id: string, status: string) {
  const { tenantId, user } = await requireTools(PERMISSIONS.TOOLS_UPDATE);
  if (!["draft", "published", "archived"].includes(status)) throw new TenantAccessError("Invalid status");
  const existing = await prisma.freeTool.findFirst({ where: { id, tenantId } });
  if (!existing) throw new TenantAccessError("Not found");
  await prisma.freeTool.update({ where: { id }, data: { status } });
  await logAudit({
    tenantId,
    userId: user.id,
    action: status === "published" ? AUDIT_ACTIONS.TOOL_PUBLISHED : status === "archived" ? AUDIT_ACTIONS.TOOL_ARCHIVED : AUDIT_ACTIONS.TOOL_UNPUBLISHED,
    resource: "tool",
    resourceId: id,
  });
  revalidateTools(existing.slug);
}

export async function updateToolOrder(id: string, sortOrder: number) {
  const { tenantId } = await requireTools(PERMISSIONS.TOOLS_UPDATE);
  const { count } = await prisma.freeTool.updateMany({ where: { id, tenantId }, data: { sortOrder } });
  if (count === 0) throw new TenantAccessError("Not found");
  revalidateTools();
}

export async function setToolFeatured(id: string, isFeatured: boolean) {
  const { tenantId } = await requireTools(PERMISSIONS.TOOLS_UPDATE);
  const { count } = await prisma.freeTool.updateMany({ where: { id, tenantId }, data: { isFeatured } });
  if (count === 0) throw new TenantAccessError("Not found");
  revalidateTools();
}

export async function deleteTool(id: string) {
  const { tenantId, user } = await requireTools(PERMISSIONS.TOOLS_DELETE);
  const existing = await prisma.freeTool.findFirst({ where: { id, tenantId } });
  if (!existing) throw new TenantAccessError("Not found");
  await prisma.freeTool.delete({ where: { id } });
  await logAudit({ tenantId, userId: user.id, action: AUDIT_ACTIONS.TOOL_DELETED, resource: "tool", resourceId: id });
  revalidateTools(existing.slug);
}

export async function getProvidersAdmin() {
  const { tenantId } = await requireTools(PERMISSIONS.TOOLS_VIEW);
  return prisma.domainProvider.findMany({
    where: { tenantId },
    include: { affiliatePrograms: true },
    orderBy: { priority: "asc" },
  });
}

export async function upsertProvider(data: {
  id?: string;
  name: string;
  slug?: string;
  logoUrl?: string;
  websiteUrl?: string;
  apiEnabled?: boolean;
  affiliateEnabled?: boolean;
  status?: string;
  priority?: number;
  adapterKey: string;
}) {
  const { tenantId, user } = await requireTools(PERMISSIONS.TOOLS_UPDATE);
  const slug = slugify(data.slug || data.name);
  const status = data.status === "disabled" ? "disabled" : "active";
  const payload = {
    name: data.name.trim(),
    slug,
    logoUrl: data.logoUrl?.trim() || null,
    websiteUrl: data.websiteUrl?.trim() || null,
    apiEnabled: Boolean(data.apiEnabled),
    affiliateEnabled: Boolean(data.affiliateEnabled),
    status,
    priority: data.priority ?? 100,
    adapterKey: data.adapterKey.trim(),
  };

  let previous: { apiEnabled: boolean; status: string } | null = null;
  if (data.id) {
    previous = await prisma.domainProvider.findFirst({ where: { id: data.id, tenantId }, select: { apiEnabled: true, status: true } });
    if (!previous) throw new TenantAccessError("Not found");
  }

  const provider = data.id
    ? await prisma.domainProvider.update({ where: { id: data.id }, data: payload })
    : await prisma.domainProvider.create({ data: { ...payload, tenantId } });

  const enabledNow = payload.apiEnabled && payload.status === "active";
  const enabledBefore = Boolean(previous?.apiEnabled && previous.status === "active");
  await logAudit({
    tenantId,
    userId: user.id,
    action: !previous ? AUDIT_ACTIONS.PROVIDER_UPDATED : enabledNow !== enabledBefore ? (enabledNow ? AUDIT_ACTIONS.PROVIDER_ENABLED : AUDIT_ACTIONS.PROVIDER_DISABLED) : AUDIT_ACTIONS.PROVIDER_UPDATED,
    resource: "domain_provider",
    resourceId: provider.id,
  });
  revalidatePath("/admin/tools/providers");
  return provider;
}

export async function getAffiliateProgramsAdmin() {
  const { tenantId } = await requireTools(PERMISSIONS.TOOLS_VIEW);
  return prisma.affiliateProgram.findMany({
    where: { tenantId },
    include: { provider: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function upsertAffiliateProgram(data: {
  id?: string;
  providerId: string;
  programName: string;
  affiliateNetwork?: string;
  trackingUrl: string;
  status?: string;
  commissionType?: string;
  commissionValue?: number | null;
  cookieDuration?: number | null;
  notes?: string;
}) {
  const { tenantId, user } = await requireTools(PERMISSIONS.TOOLS_UPDATE);
  if (!isSafeRedirectUrl(data.trackingUrl)) {
    throw new TenantAccessError("Tracking URL must be a valid http(s) URL");
  }
  const provider = await prisma.domainProvider.findFirst({ where: { id: data.providerId, tenantId } });
  if (!provider) throw new TenantAccessError("Provider not found");

  const previous = data.id
    ? await prisma.affiliateProgram.findFirst({ where: { id: data.id, tenantId } })
    : null;
  if (data.id && !previous) throw new TenantAccessError("Not found");

  const payload = {
    programName: data.programName.trim(),
    affiliateNetwork: data.affiliateNetwork?.trim() || null,
    trackingUrl: data.trackingUrl.trim(),
    status: data.status === "disabled" ? "disabled" : "active",
    commissionType: data.commissionType?.trim() || null,
    commissionValue: data.commissionValue ?? null,
    cookieDuration: data.cookieDuration ?? null,
    notes: data.notes?.trim() || null,
    providerId: data.providerId,
  };

  const program = data.id
    ? await prisma.affiliateProgram.update({ where: { id: data.id }, data: payload })
    : await prisma.affiliateProgram.create({ data: { ...payload, tenantId } });

  await logAudit({
    tenantId,
    userId: user.id,
    action: previous && previous.trackingUrl !== payload.trackingUrl ? AUDIT_ACTIONS.AFFILIATE_URL_CHANGED : AUDIT_ACTIONS.AFFILIATE_UPDATED,
    resource: "affiliate_program",
    resourceId: program.id,
  });
  revalidatePath("/admin/tools/affiliates");
  return program;
}

export async function deleteAffiliateProgram(id: string) {
  const { tenantId, user } = await requireTools(PERMISSIONS.TOOLS_DELETE);
  const { count } = await prisma.affiliateProgram.deleteMany({ where: { id, tenantId } });
  if (count === 0) throw new TenantAccessError("Not found");
  await logAudit({ tenantId, userId: user.id, action: AUDIT_ACTIONS.AFFILIATE_UPDATED, resource: "affiliate_program", resourceId: id });
  revalidatePath("/admin/tools/affiliates");
}

export async function getSeoPagesAdmin() {
  const { tenantId } = await requireTools(PERMISSIONS.TOOLS_VIEW);
  const [landings, tlds, comparisons] = await Promise.all([
    prisma.seoLandingPage.findMany({ where: { tenantId }, orderBy: { slug: "asc" } }),
    prisma.domainExtension.findMany({ where: { tenantId }, orderBy: { tld: "asc" } }),
    prisma.registrarComparison.findMany({ where: { tenantId }, include: { providerA: true, providerB: true }, orderBy: { slug: "asc" } }),
  ]);
  return { landings, tlds, comparisons };
}

export async function upsertSeoLandingPage(data: {
  id?: string;
  slug: string;
  pageType: string;
  title: string;
  content: string;
  seoTitle?: string;
  seoDescription?: string;
  canonicalUrl?: string;
  ogImage?: string;
  status?: string;
}) {
  const { tenantId, user } = await requireTools(PERMISSIONS.TOOLS_UPDATE);
  const slug = slugify(data.slug);
  const status = ["draft", "published", "archived"].includes(data.status || "") ? data.status! : "draft";
  const payload = {
    slug,
    pageType: data.pageType.trim() || "custom",
    title: data.title.trim(),
    content: data.content,
    seoTitle: data.seoTitle?.trim() || null,
    seoDescription: data.seoDescription?.trim() || null,
    canonicalUrl: data.canonicalUrl?.trim() || null,
    ogImage: data.ogImage?.trim() || null,
    status,
  };
  const page = data.id
    ? await prisma.seoLandingPage.update({ where: { id: data.id }, data: payload })
    : await prisma.seoLandingPage.create({ data: { ...payload, tenantId } });
  await logAudit({ tenantId, userId: user.id, action: AUDIT_ACTIONS.TOOL_SEO_CHANGED, resource: "seo_landing_page", resourceId: page.id });
  revalidatePath("/admin/tools/seo-pages");
  revalidatePath(`/${page.slug}`);
  revalidatePath("/sitemap.xml");
  return page;
}

export async function upsertDomainExtension(data: {
  id?: string;
  tld: string;
  name: string;
  description?: string;
  seoTitle?: string;
  seoDescription?: string;
  content?: string;
  faqJson?: string;
  status?: string;
}) {
  const { tenantId, user } = await requireTools(PERMISSIONS.TOOLS_UPDATE);
  const tld = data.tld.replace(/^\./, "").toLowerCase().trim();
  const status = ["draft", "published", "archived"].includes(data.status || "") ? data.status! : "draft";
  const payload = {
    tld,
    name: data.name.trim(),
    description: data.description?.trim() || null,
    seoTitle: data.seoTitle?.trim() || null,
    seoDescription: data.seoDescription?.trim() || null,
    content: data.content || null,
    faqJson: data.faqJson || null,
    status,
  };
  const page = data.id
    ? await prisma.domainExtension.update({ where: { id: data.id }, data: payload })
    : await prisma.domainExtension.create({ data: { ...payload, tenantId } });
  await logAudit({ tenantId, userId: user.id, action: AUDIT_ACTIONS.TOOL_SEO_CHANGED, resource: "domain_extension", resourceId: page.id });
  revalidatePath("/admin/tools/seo-pages");
  revalidatePath(`/domains/${tld}`);
  revalidatePath("/sitemap.xml");
  return page;
}

export async function upsertRegistrarComparison(data: {
  id?: string;
  providerAId: string;
  providerBId: string;
  slug?: string;
  title: string;
  content?: string;
  seoTitle?: string;
  seoDescription?: string;
  status?: string;
}) {
  const { tenantId, user } = await requireTools(PERMISSIONS.TOOLS_UPDATE);
  if (data.providerAId === data.providerBId) throw new TenantAccessError("Choose two different providers");
  const [a, b] = await Promise.all([
    prisma.domainProvider.findFirst({ where: { id: data.providerAId, tenantId } }),
    prisma.domainProvider.findFirst({ where: { id: data.providerBId, tenantId } }),
  ]);
  if (!a || !b) throw new TenantAccessError("Provider not found");
  const slug = slugify(data.slug || `${a.slug}-vs-${b.slug}`);
  const status = ["draft", "published", "archived"].includes(data.status || "") ? data.status! : "draft";
  const payload = {
    providerAId: a.id,
    providerBId: b.id,
    slug,
    title: data.title.trim(),
    content: data.content || null,
    seoTitle: data.seoTitle?.trim() || null,
    seoDescription: data.seoDescription?.trim() || null,
    status,
  };
  const page = data.id
    ? await prisma.registrarComparison.update({ where: { id: data.id }, data: payload })
    : await prisma.registrarComparison.create({ data: { ...payload, tenantId } });
  await logAudit({ tenantId, userId: user.id, action: AUDIT_ACTIONS.TOOL_SEO_CHANGED, resource: "registrar_comparison", resourceId: page.id });
  revalidatePath("/admin/tools/seo-pages");
  revalidatePath(`/compare/${slug}`);
  revalidatePath("/sitemap.xml");
  return page;
}

export async function getFreeToolsSettingsAdmin() {
  const { tenantId } = await requireTools(PERMISSIONS.TOOLS_VIEW);
  return getFreeToolsSettings(tenantId);
}

export async function saveFreeToolsSettingsAdmin(input: FreeToolsSettings) {
  const { tenantId, user } = await requireTools(PERMISSIONS.TOOLS_UPDATE);
  const settings = parseFreeToolsSettings(input);
  await saveFreeToolsSettings(tenantId, settings);
  await logAudit({ tenantId, userId: user.id, action: AUDIT_ACTIONS.SETTINGS_UPDATED, resource: "free_tools_settings" });
  revalidateTools();
  return settings;
}

export async function getToolsAnalytics(days = 30) {
  const { tenantId } = await requireTools(PERMISSIONS.TOOLS_VIEW);
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const events = await prisma.toolAnalyticsEvent.findMany({
    where: { tenantId, createdAt: { gte: since } },
    select: { eventType: true, domain: true, tld: true, providerId: true, toolId: true },
  });
  const count = (type: string) => events.filter((e) => e.eventType === type).length;
  const views = count("tool_view");
  const searches = count("domain_search");
  const available = count("domain_available");
  const unavailable = count("domain_unavailable");
  const buyClicks = count("buy_click");
  const affiliateClicks = count("affiliate_click");
  const providerErrors = count("provider_error");
  const tldCounts = new Map<string, number>();
  for (const event of events) {
    if (event.tld) tldCounts.set(event.tld, (tldCounts.get(event.tld) || 0) + 1);
  }
  const providerCounts = new Map<string, number>();
  for (const event of events) {
    if (event.providerId && (event.eventType === "buy_click" || event.eventType === "affiliate_click")) {
      providerCounts.set(event.providerId, (providerCounts.get(event.providerId) || 0) + 1);
    }
  }
  const providers = await prisma.domainProvider.findMany({ where: { tenantId }, select: { id: true, name: true, slug: true } });
  const providerNames = new Map(providers.map((p) => [p.id, p.name]));

  return {
    views,
    searches,
    available,
    unavailable,
    buyClicks,
    affiliateClicks,
    providerErrors,
    comparisonViews: count("comparison_view"),
    affiliateCtr: searches > 0 ? (affiliateClicks / searches) * 100 : 0,
    topTlds: [...tldCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([tld, n]) => ({ tld, count: n })),
    topProviders: [...providerCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([id, n]) => ({ id, name: providerNames.get(id) || id, count: n })),
  };
}
