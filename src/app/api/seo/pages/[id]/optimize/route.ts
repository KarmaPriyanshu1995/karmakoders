import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildPageUrl } from "@/lib/sitePages";
import { optimizePage } from "@/lib/seo/automationEngine";
import { analyzePage, extractPageHtmlFromSections } from "@/lib/seo/analyzer";
import { calcPageScores } from "@/lib/seo/scorer";
import { detectEntities, calcEntityScore } from "@/lib/seo/entityDetector";
import { generateAllRecommendations } from "@/lib/seo/aiRecommender";
import { requireTenantContext, TenantAccessError } from "@/lib/tenant-context";
import { assertPermission, PERMISSIONS } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { tenantId, role, permissionOverrides } = await requireTenantContext();
    assertPermission(role, PERMISSIONS.SEO_UPDATE, permissionOverrides);

    const { id } = await params;
    const body = await req.json();
    const { pageType } = body;

    if (!id || !pageType) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
    }

    // Enable all rules for single page optimization (excluding reports)
    const rules = {
      meta_title: true,
      meta_desc: true,
      alt_tags: true,
      schema: true,
      internal_links: true,
      reports: false,
    };

    // 1. Run the optimization engine
    const optimizeResult = await optimizePage(id, pageType, rules, tenantId);

    // 2. Fetch updated page data
    let pageData: any = null;
    let url = "";

    if (pageType === "post") {
      const post = await prisma.post.findFirst({ where: { id, tenantId } });
      if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });
      const meta = post.seoMeta ? JSON.parse(post.seoMeta) : {};
      pageData = { id: post.id, title: post.title, slug: post.slug, content: post.content, metaTitle: meta.title || null, metaDescription: meta.description || null };
      url = buildPageUrl(post.slug, "post");
    } else if (pageType === "project") {
      const project = await prisma.project.findFirst({ where: { id, tenantId } });
      if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });
      pageData = { id: project.id, title: project.title, slug: project.slug, content: project.content, metaTitle: null, metaDescription: null };
      url = buildPageUrl(project.slug, "project");
    } else {
      const page = await prisma.page.findFirst({
        where: { id, tenantId },
        include: { sections: { orderBy: { order: "asc" } } },
      });
      if (!page) return NextResponse.json({ error: "Page not found" }, { status: 404 });
      const meta = page.seoMeta ? JSON.parse(page.seoMeta) : {};
      const htmlContent = extractPageHtmlFromSections(
        page.sections.map((s) => ({ content: s.content }))
      );
      pageData = {
        id: page.id,
        title: page.title,
        slug: page.slug,
        content: htmlContent || null,
        metaTitle: meta.title || null,
        metaDescription: meta.description || null,
      };
      url = buildPageUrl(page.slug, "page");
    }

    // 3. Re-run analysis & calculate updated scores
    const analysis = analyzePage({
      title: pageData.title,
      metaTitle: pageData.metaTitle,
      metaDescription: pageData.metaDescription,
      content: pageData.content || "",
      slug: pageData.slug,
    });

    const entities = detectEntities((pageData.content || "") + " " + pageData.title);
    const entityScore = calcEntityScore(entities.length, 10);

    const existingSchemaEntries = await prisma.seoSchema.findMany({ where: { tenantId, pageId: id } });
    const hasPageSchema = existingSchemaEntries.length > 0;
    const pageSchemaTypes = existingSchemaEntries.map((s) => s.schemaType);

    const internalLinks = await prisma.seoInternalLink.findMany({ where: { tenantId, fromPageId: id } });

    const scores = calcPageScores({
      hasMetaTitle: !!analysis.metaTitle,
      hasMetaDescription: !!analysis.metaDescription,
      hasH1: !!analysis.h1,
      multipleH1: analysis.headings.filter((h) => h.level === 1).length > 1,
      wordCount: analysis.wordCount,
      readabilityScore: analysis.readabilityScore,
      imagesCount: analysis.imagesCount,
      imagesWithAlt: analysis.imagesWithAlt,
      isIndexed: true,
      hasFaq: analysis.hasFaq,
      headingCount: analysis.headings.length,
      entityScore,
      internalLinksCount: internalLinks.length,
      isOrphan: internalLinks.length === 0,
      hasSchema: hasPageSchema,
      schemaTypes: pageSchemaTypes,
      hasOptimizedTitle: (analysis.metaTitle?.length || 0) >= 50 && (analysis.metaTitle?.length || 0) <= 60,
      hasOptimizedDesc: (analysis.metaDescription?.length || 0) >= 140 && (analysis.metaDescription?.length || 0) <= 160,
    });

    const recommendations = generateAllRecommendations({
      url,
      title: pageData.title,
      metaTitle: analysis.metaTitle,
      metaDescription: analysis.metaDescription,
      h1: analysis.h1,
      wordCount: analysis.wordCount,
      primaryKeyword: Object.keys(analysis.keywordDensity)[0] || "",
      pageType,
      topKeywords: Object.keys(analysis.keywordDensity).slice(0, 5),
      hasFaq: analysis.hasFaq,
      hasSchema: hasPageSchema,
      internalLinksCount: internalLinks.length,
      readabilityScore: analysis.readabilityScore,
      issues: analysis.issues,
    });

    return NextResponse.json({
      success: true,
      logs: optimizeResult.logs,
      analysis,
      scores,
      entities,
      entityScore,
      recommendations,
      url,
    });
  } catch (error) {
    if (error instanceof TenantAccessError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("[SEO Page Optimize POST Error]", error);
    return NextResponse.json({ error: "Optimization failed" }, { status: 500 });
  }
}
