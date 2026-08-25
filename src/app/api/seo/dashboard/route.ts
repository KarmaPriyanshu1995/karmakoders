import { NextResponse } from "next/server";
import { prisma, withDbRetry } from "@/lib/prisma";
import { runAudit, AuditPage } from "@/lib/seo/auditEngine";
import { calcSiteScores } from "@/lib/seo/scorer";
import { requireTenantContext, TenantAccessError } from "@/lib/tenant-context";
import { assertPermission, PERMISSIONS } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { tenantId, role, permissionOverrides } = await requireTenantContext();
    assertPermission(role, PERMISSIONS.SEO_VIEW, permissionOverrides);

    // Fetch all content
    const [pages, posts, projects, seoPages, latestAudit, issues, brand, searchConsole, keywords] = await withDbRetry(() => Promise.all([
      prisma.page.findMany({ where: { tenantId }, select: { id: true, slug: true, title: true, seoMeta: true, isPublished: true } }),
      prisma.post.findMany({ where: { tenantId }, select: { id: true, slug: true, title: true, seoMeta: true, published: true, content: true, image: true } }),
      prisma.project.findMany({ where: { tenantId }, select: { id: true, slug: true, title: true, content: true } }),
      prisma.seoPage.findMany({ where: { tenantId } }),
      prisma.seoAudit.findFirst({ where: { tenantId }, orderBy: { runAt: "desc" } }),
      prisma.seoIssue.findMany({ where: { tenantId, isFixed: false }, orderBy: { createdAt: "desc" }, take: 50 }),
      prisma.seoBrand.findFirst({ where: { tenantId } }),
      prisma.seoSearchConsole.findFirst({ where: { tenantId }, orderBy: { fetchedAt: "desc" } }),
      prisma.seoKeywordOpportunity.findMany({ where: { tenantId }, orderBy: { opportunityScore: "desc" }, take: 10 }),
    ]));

    // Build audit pages from DB content
    const auditPages: AuditPage[] = [
      ...pages.map((p) => {
        const meta = p.seoMeta ? JSON.parse(p.seoMeta) : {};
        return { id: p.id, type: "page" as const, title: p.title, metaTitle: meta.title, metaDescription: meta.description, slug: p.slug, isIndexed: p.isPublished };
      }),
      ...posts.map((p) => {
        const meta = p.seoMeta ? JSON.parse(p.seoMeta) : {};
        return { id: p.id, type: "post" as const, title: p.title, metaTitle: meta.title, metaDescription: meta.description, slug: p.slug, content: p.content, isIndexed: p.published };
      }),
      ...projects.map((p) => ({
        id: p.id, type: "project" as const, title: p.title, metaTitle: null, metaDescription: null, slug: p.slug, content: p.content, isIndexed: true,
      })),
    ];

    const auditResult = runAudit(auditPages);

    // Compute site scores from seoPages
    const pageScores = seoPages.map((sp) => ({
      technical: sp.technicalScore,
      content: sp.contentScore,
      entity: sp.entityScore,
      internalLink: sp.internalLinkScore,
      schema: sp.schemaScore,
      ctr: sp.ctrScore,
      overall: sp.overallScore,
    }));

    const siteScores = pageScores.length > 0
      ? calcSiteScores({
          pages: pageScores,
          totalPages: auditResult.totalPages,
          indexedPages: auditResult.indexedPages,
          brokenLinks: latestAudit?.brokenLinks || 0,
          orphanPages: latestAudit?.orphanPages || 0,
          missingTitles: auditResult.missingTitles,
          missingDescriptions: auditResult.missingDescriptions,
        })
      : { technical: auditResult.technicalScore, content: 0, entity: 0, internalLink: 0, schema: 0, ctr: 0, overall: Math.round(auditResult.technicalScore * 0.25) };

    // Issue severity breakdown
    const criticalIssues = issues.filter((i) => i.severity === "critical").length;
    const importantIssues = issues.filter((i) => i.severity === "important").length;
    const recommendedIssues = issues.filter((i) => i.severity === "recommended").length;

    // Pages missing various elements
    const missingMetaTitles = auditResult.missingTitles;
    const missingMetaDescs = auditResult.missingDescriptions;
    const missingSchema = auditPages.length - seoPages.filter((p) => p.hasSchema).length;
    const missingFaq = seoPages.filter((p) => !p.hasFaq).length;
    const orphanPages = seoPages.filter((p) => p.isOrphan).length;
    const lowContentPages = seoPages.filter((p) => p.contentScore < 40).length;

    return NextResponse.json({
      scores: siteScores,
      audit: {
        totalPages: auditResult.totalPages,
        indexedPages: auditResult.indexedPages,
        nonIndexedPages: auditResult.nonIndexedPages,
        missingTitles: missingMetaTitles,
        missingDescriptions: missingMetaDescs,
        missingSchema,
        missingFaq,
        orphanPages,
        lowContentPages,
        lastAuditAt: latestAudit?.runAt || null,
      },
      issues: {
        critical: criticalIssues,
        important: importantIssues,
        recommended: recommendedIssues,
        total: issues.length,
        recent: issues.slice(0, 5).map((i) => ({ type: i.type, severity: i.severity, description: i.description, url: i.url })),
      },
      searchConsole: searchConsole ? {
        clicks: searchConsole.totalClicks,
        impressions: searchConsole.totalImpressions,
        ctr: searchConsole.avgCtr,
        position: searchConsole.avgPosition,
        connected: searchConsole.connected,
      } : { connected: false },
      keywords: keywords.map((k) => ({ keyword: k.keyword, position: k.currentPosition, impressions: k.impressions, score: k.opportunityScore })),
      brand: brand ? { name: brand.brandName, score: brand.brandScore } : null,
    });
  } catch (error) {
    if (error instanceof TenantAccessError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("[SEO Dashboard]", error);
    return NextResponse.json({ error: "Failed to load dashboard data" }, { status: 500 });
  }
}
