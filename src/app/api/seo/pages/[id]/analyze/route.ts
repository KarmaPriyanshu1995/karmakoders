import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildPageUrl } from "@/lib/sitePages";
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
    const { tenantId, role } = await requireTenantContext();
    assertPermission(role, PERMISSIONS.SEO_UPDATE);

    const { id } = await params;
    const body = await req.json();
    const { pageType } = body; // "page" | "post" | "project"

    let pageData: { id: string; title: string; slug: string; content: string | null; metaTitle: string | null; metaDescription: string | null; imageUrl: string | null } | null = null;

    if (pageType === "post") {
      const post = await prisma.post.findFirst({ where: { id, tenantId } });
      if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });
      const meta = post.seoMeta ? JSON.parse(post.seoMeta) : {};
      pageData = { id: post.id, title: post.title, slug: post.slug, content: post.content, metaTitle: meta.title || null, metaDescription: meta.description || null, imageUrl: post.image || null };
    } else if (pageType === "project") {
      const project = await prisma.project.findFirst({ where: { id, tenantId } });
      if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });
      pageData = { id: project.id, title: project.title, slug: project.slug, content: project.content, metaTitle: null, metaDescription: null, imageUrl: project.imageUrl || null };
    } else {
      const page = await prisma.page.findFirst({
        where: { id, tenantId },
        include: { sections: { orderBy: { order: "asc" } } },
      });
      if (!page) return NextResponse.json({ error: "Not found" }, { status: 404 });
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
        imageUrl: null,
      };
    }

    const url = buildPageUrl(pageData.slug, pageType || "page");

    // Run analysis
    const analysis = analyzePage({
      title: pageData.title,
      metaTitle: pageData.metaTitle,
      metaDescription: pageData.metaDescription,
      content: pageData.content || "",
      slug: pageData.slug,
    });

    // Detect entities
    const entities = detectEntities((pageData.content || "") + " " + (pageData.title || ""));
    const entityScore = calcEntityScore(entities.length, 10);

    // Calculate scores
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
      internalLinksCount: 0,
      isOrphan: false,
      hasSchema: false,
      hasOptimizedTitle: (analysis.metaTitle?.length || 0) >= 50 && (analysis.metaTitle?.length || 0) <= 60,
      hasOptimizedDesc: (analysis.metaDescription?.length || 0) >= 140 && (analysis.metaDescription?.length || 0) <= 160,
    });

    // Generate AI recommendations
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
      hasSchema: false,
      internalLinksCount: 0,
      readabilityScore: analysis.readabilityScore,
      issues: analysis.issues,
    });

    // Upsert into DB
    await prisma.seoPage.upsert({
      where: { tenantId_pageType_pageId: { tenantId, pageType: pageType || "page", pageId: id } },
      create: {
        tenantId,
        pageType: pageType || "page",
        pageId: id,
        url,
        title: pageData.title,
        metaTitle: analysis.metaTitle,
        metaDescription: analysis.metaDescription,
        h1: analysis.h1,
        headingsJson: JSON.stringify(analysis.headings),
        wordCount: analysis.wordCount,
        readabilityScore: analysis.readabilityScore,
        keywordDensityJson: JSON.stringify(analysis.keywordDensity),
        imagesCount: analysis.imagesCount,
        imagesWithAlt: analysis.imagesWithAlt,
        hasFaq: analysis.hasFaq,
        contentScore: scores.content,
        technicalScore: scores.technical,
        entityScore: scores.entity,
        internalLinkScore: scores.internalLink,
        schemaScore: scores.schema,
        ctrScore: scores.ctr,
        overallScore: scores.overall,
        issuesJson: JSON.stringify(analysis.issues),
        recommendationsJson: JSON.stringify(recommendations),
        lastAnalyzed: new Date(),
      },
      update: {
        title: pageData.title,
        metaTitle: analysis.metaTitle,
        metaDescription: analysis.metaDescription,
        h1: analysis.h1,
        headingsJson: JSON.stringify(analysis.headings),
        wordCount: analysis.wordCount,
        readabilityScore: analysis.readabilityScore,
        keywordDensityJson: JSON.stringify(analysis.keywordDensity),
        imagesCount: analysis.imagesCount,
        imagesWithAlt: analysis.imagesWithAlt,
        hasFaq: analysis.hasFaq,
        contentScore: scores.content,
        technicalScore: scores.technical,
        entityScore: scores.entity,
        internalLinkScore: scores.internalLink,
        schemaScore: scores.schema,
        ctrScore: scores.ctr,
        overallScore: scores.overall,
        issuesJson: JSON.stringify(analysis.issues),
        recommendationsJson: JSON.stringify(recommendations),
        lastAnalyzed: new Date(),
      },
    });

    return NextResponse.json({
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
    console.error("[SEO Analyze Page]", error);
    return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
  }
}
