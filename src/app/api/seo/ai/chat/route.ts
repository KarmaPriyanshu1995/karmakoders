import { NextRequest, NextResponse } from "next/server";
import { prisma, withDbRetry } from "@/lib/prisma";
import { requireTenantContext, TenantAccessError } from "@/lib/tenant-context";
import { assertPermission, PERMISSIONS } from "@/lib/permissions";
import { calcSiteScores } from "@/lib/seo/scorer";
import { runAudit, type AuditPage } from "@/lib/seo/auditEngine";
import { answerSeoQuestion, type SeoAssistantSnapshot } from "@/lib/seo/assistant";

export const dynamic = "force-dynamic";

async function loadSnapshot(tenantId: string): Promise<SeoAssistantSnapshot> {
  const [pages, posts, projects, seoPages, issues, brand, searchConsole, keywords, clusters, lastLog] = await withDbRetry(() =>
    Promise.all([
      prisma.page.findMany({ where: { tenantId }, select: { id: true, slug: true, title: true, seoMeta: true, isPublished: true } }),
      prisma.post.findMany({ where: { tenantId }, select: { id: true, slug: true, title: true, seoMeta: true, published: true, content: true } }),
      prisma.project.findMany({ where: { tenantId }, select: { id: true, slug: true, title: true, content: true } }),
      prisma.seoPage.findMany({ where: { tenantId } }),
      prisma.seoIssue.findMany({ where: { tenantId, isFixed: false }, orderBy: { createdAt: "desc" }, take: 20 }),
      prisma.seoBrand.findFirst({ where: { tenantId } }),
      prisma.seoSearchConsole.findFirst({ where: { tenantId }, orderBy: { fetchedAt: "desc" } }),
      prisma.seoKeywordOpportunity.findMany({ where: { tenantId }, orderBy: { opportunityScore: "desc" }, take: 5 }),
      prisma.seoCluster.findMany({ where: { tenantId }, orderBy: { healthScore: "asc" }, take: 8 }),
      prisma.seoAutomationLog.findFirst({ where: { tenantId }, orderBy: { createdAt: "desc" } }),
    ])
  );

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
  const pageScores = seoPages.map((sp) => ({
    technical: sp.technicalScore,
    content: sp.contentScore,
    entity: sp.entityScore,
    internalLink: sp.internalLinkScore,
    schema: sp.schemaScore,
    ctr: sp.ctrScore,
    overall: sp.overallScore,
  }));
  const siteScores = pageScores.length
    ? calcSiteScores({
        pages: pageScores,
        totalPages: auditResult.totalPages,
        indexedPages: auditResult.indexedPages,
        brokenLinks: 0,
        orphanPages: seoPages.filter((p) => p.isOrphan).length,
        missingTitles: auditResult.missingTitles,
        missingDescriptions: auditResult.missingDescriptions,
      })
    : { technical: auditResult.technicalScore, content: 0, entity: 0, internalLink: 0, schema: 0, ctr: 0, overall: Math.round(auditResult.technicalScore * 0.25) };

  return {
    scores: {
      overall: siteScores.overall,
      technical: siteScores.technical,
      content: siteScores.content,
      schema: siteScores.schema,
      entity: siteScores.entity,
      internalLink: siteScores.internalLink,
    },
    audit: {
      totalPages: auditResult.totalPages,
      missingTitles: auditResult.missingTitles,
      missingDescriptions: auditResult.missingDescriptions,
      missingSchema: Math.max(0, auditPages.length - seoPages.filter((p) => p.hasSchema).length),
      orphanPages: seoPages.filter((p) => p.isOrphan).length,
      lowContentPages: seoPages.filter((p) => p.contentScore < 40).length,
    },
    issues: issues.map((i) => ({ type: i.type, severity: i.severity, description: i.description, url: i.url })),
    clusters: clusters.map((c) => {
      let missing: string[] = [];
      if (c.missingTopics) {
        try {
          const parsed = JSON.parse(c.missingTopics) as unknown;
          missing = Array.isArray(parsed) ? parsed.map(String) : [];
        } catch {
          missing = [];
        }
      }
      return { name: c.name, healthScore: c.healthScore, missing };
    }),
    gscConnected: Boolean(searchConsole?.connected),
    gscClicks: searchConsole?.totalClicks ?? 0,
    keywords: keywords.map((k) => ({ keyword: k.keyword, position: k.currentPosition })),
    lastAutomationAt: lastLog?.createdAt ? lastLog.createdAt.toISOString() : null,
    brandName: brand?.brandName ?? null,
  };
}

export async function POST(req: NextRequest) {
  try {
    const { tenantId, role, permissionOverrides } = await requireTenantContext();
    assertPermission(role, PERMISSIONS.SEO_VIEW, permissionOverrides);

    const body = await req.json();
    const question = typeof body.question === "string" ? body.question.trim() : "";
    if (!question) {
      return NextResponse.json({ error: "Question is required" }, { status: 400 });
    }

    const snapshot = await loadSnapshot(tenantId);
    const answer = answerSeoQuestion(question, snapshot);

    await prisma.seoAutomationLog.create({
      data: {
        tenantId,
        action: "ai_chat",
        status: "success",
        triggeredBy: "manual",
        after: JSON.stringify({ intent: answer.intent, question: question.slice(0, 200) }),
      },
    });

    return NextResponse.json({ ...answer, snapshot });
  } catch (error) {
    if (error instanceof TenantAccessError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("[SEO AI Chat]", error);
    return NextResponse.json({ error: "Assistant failed" }, { status: 500 });
  }
}
