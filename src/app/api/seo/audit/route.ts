import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { syncSitePages } from "@/lib/actions";
import { buildPageUrl } from "@/lib/sitePages";
import { runAuditAsync, AuditPage } from "@/lib/seo/auditEngine";
import { extractHtmlFromSection, analyzePage } from "@/lib/seo/analyzer";
import { calcPageScores } from "@/lib/seo/scorer";
import { detectEntities, calcEntityScore } from "@/lib/seo/entityDetector";
import { generateAllRecommendations } from "@/lib/seo/aiRecommender";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    await syncSitePages();

    const [pages, posts, projects] = await Promise.all([
      prisma.page.findMany({
        include: { sections: { orderBy: { order: "asc" } } }
      }),
      prisma.post.findMany(),
      prisma.project.findMany(),
    ]);

    const auditPages: AuditPage[] = [
      ...pages.map((p) => {
        const meta = p.seoMeta ? JSON.parse(p.seoMeta) : {};
        const htmlContent = p.sections.map((s) => {
          try {
            return extractHtmlFromSection(JSON.parse(s.content));
          } catch {
            return "";
          }
        }).join("\n");
        return {
          id: p.id,
          type: "page" as const,
          title: p.title,
          metaTitle: meta.title || null,
          metaDescription: meta.description || null,
          slug: p.slug,
          content: htmlContent,
          published: p.isPublished,
          isIndexed: p.isPublished,
        };
      }),
      ...posts.map((p) => {
        const meta = p.seoMeta ? JSON.parse(p.seoMeta) : {};
        return {
          id: p.id,
          type: "post" as const,
          title: p.title,
          metaTitle: meta.title || null,
          metaDescription: meta.description || null,
          slug: p.slug,
          content: p.content,
          published: p.published,
          isIndexed: p.published,
        };
      }),
      ...projects.map((p) => ({
        id: p.id,
        type: "project" as const,
        title: p.title,
        metaTitle: null,
        metaDescription: null,
        slug: p.slug,
        content: p.content,
        published: true,
        isIndexed: true,
      })),
    ];

    const result = await runAuditAsync(auditPages);

    // Save audit to DB
    const audit = await prisma.seoAudit.create({
      data: {
        totalPages: result.totalPages,
        indexedPages: result.indexedPages,
        nonIndexedPages: result.nonIndexedPages,
        brokenPages: 0,
        brokenLinks: result.brokenLinks,
        missingTitles: result.missingTitles,
        duplicateTitles: result.duplicateTitles,
        missingDescriptions: result.missingDescriptions,
        duplicateDescriptions: result.duplicateDescriptions,
        missingH1: result.missingH1,
        multipleH1: result.multipleH1,
        missingAlt: result.missingAlt,
        orphanPages: result.orphanPages,
        missingSchema: 0,
        overallScore: result.technicalScore,
        technicalScore: result.technicalScore,
        contentScore: 80,
        issuesSummaryJson: JSON.stringify(result.issues.slice(0, 100)),
        status: "complete",
      },
    });

    // Clear old unresolved issues
    await prisma.seoIssue.deleteMany({
      where: { isFixed: false }
    });

    // Upsert issues
    for (const issue of result.issues) {
      await prisma.seoIssue.create({
        data: {
          pageId: issue.pageId || null,
          pageType: issue.pageType || null,
          url: issue.url || null,
          type: issue.type,
          severity: issue.severity,
          description: issue.description,
          suggestion: issue.suggestion,
        },
      });
    }

    // Save links to seo_internal_links
    await prisma.seoInternalLink.deleteMany();
    for (const link of result.internalLinks) {
      await prisma.seoInternalLink.create({
        data: {
          fromPageId: link.fromPageId,
          toPageId: link.toPageId || "",
          url: link.url,
          anchorText: link.anchorText,
          isBroken: link.isBroken,
          isSuggested: false,
        }
      });
    }

    // Update seo_pages scores
    const dbSchemas = await prisma.seoSchema.findMany({ where: { isApplied: true } });
    const schemaMap = new Map(dbSchemas.map((s) => [s.pageId, s]));

    for (const auditPage of auditPages) {
      const url = buildPageUrl(auditPage.slug, auditPage.type);
      
      const analysis = analyzePage({
        title: auditPage.title,
        metaTitle: auditPage.metaTitle,
        metaDescription: auditPage.metaDescription,
        content: auditPage.content || "",
        slug: auditPage.slug,
      });

      const entities = detectEntities((auditPage.content || "") + " " + (auditPage.title || ""));
      const entityScore = calcEntityScore(entities.length, 10);

      const incomingLinks = result.internalLinks.filter(l => l.toPageId === auditPage.id);
      const incomingLinksCount = incomingLinks.length;
      
      const outgoingLinks = result.internalLinks.filter(l => l.fromPageId === auditPage.id);

      const isOrphan = auditPage.slug !== "home" && incomingLinksCount === 0;

      const pageSchema = schemaMap.get(auditPage.id);
      const hasSchema = !!pageSchema;
      const schemaTypes = pageSchema?.schemaType ? [pageSchema.schemaType] : [];

      const pageIssues = result.issues.filter(i => i.pageId === auditPage.id);

      const scores = calcPageScores({
        hasMetaTitle: !!analysis.metaTitle,
        hasMetaDescription: !!analysis.metaDescription,
        hasH1: !!analysis.h1,
        multipleH1: analysis.headings.filter((h) => h.level === 1).length > 1,
        wordCount: analysis.wordCount,
        readabilityScore: analysis.readabilityScore,
        imagesCount: analysis.imagesCount,
        imagesWithAlt: analysis.imagesWithAlt,
        isIndexed: auditPage.isIndexed !== false,
        hasFaq: analysis.hasFaq,
        headingCount: analysis.headings.length,
        entityScore,
        internalLinksCount: incomingLinksCount,
        isOrphan,
        hasSchema,
        schemaTypes,
        hasOptimizedTitle: (analysis.metaTitle?.length || 0) >= 50 && (analysis.metaTitle?.length || 0) <= 60,
        hasOptimizedDesc: (analysis.metaDescription?.length || 0) >= 140 && (analysis.metaDescription?.length || 0) <= 160,
      });

      const recommendations = generateAllRecommendations({
        url,
        title: auditPage.title,
        metaTitle: analysis.metaTitle,
        metaDescription: analysis.metaDescription,
        h1: analysis.h1,
        wordCount: analysis.wordCount,
        primaryKeyword: Object.keys(analysis.keywordDensity)[0] || "",
        pageType: auditPage.type,
        topKeywords: Object.keys(analysis.keywordDensity).slice(0, 5),
        hasFaq: analysis.hasFaq,
        hasSchema,
        internalLinksCount: incomingLinksCount,
        readabilityScore: analysis.readabilityScore,
        issues: pageIssues,
      });

      await prisma.seoPage.upsert({
        where: { pageType_pageId: { pageType: auditPage.type, pageId: auditPage.id } },
        create: {
          pageType: auditPage.type,
          pageId: auditPage.id,
          url,
          title: auditPage.title,
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
          hasSchema,
          schemaTypes: schemaTypes.join(","),
          internalLinksCount: incomingLinksCount,
          externalLinksCount: outgoingLinks.filter(l => l.isExternal).length,
          contentScore: scores.content,
          technicalScore: scores.technical,
          entityScore: scores.entity,
          internalLinkScore: scores.internalLink,
          schemaScore: scores.schema,
          ctrScore: scores.ctr,
          overallScore: scores.overall,
          issuesJson: JSON.stringify(pageIssues),
          recommendationsJson: JSON.stringify(recommendations),
          isIndexed: auditPage.isIndexed !== false,
          isOrphan,
        },
        update: {
          title: auditPage.title,
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
          hasSchema,
          schemaTypes: schemaTypes.join(","),
          internalLinksCount: incomingLinksCount,
          externalLinksCount: outgoingLinks.filter(l => l.isExternal).length,
          contentScore: scores.content,
          technicalScore: scores.technical,
          entityScore: scores.entity,
          internalLinkScore: scores.internalLink,
          schemaScore: scores.schema,
          ctrScore: scores.ctr,
          overallScore: scores.overall,
          issuesJson: JSON.stringify(pageIssues),
          recommendationsJson: JSON.stringify(recommendations),
          isIndexed: auditPage.isIndexed !== false,
          isOrphan,
          lastAnalyzed: new Date(),
        },
      });
    }

    return NextResponse.json({ success: true, audit: { id: audit.id, ...result } });
  } catch (error) {
    console.error("[SEO Audit]", error);
    return NextResponse.json({ error: "Audit failed" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const audits = await prisma.seoAudit.findMany({ orderBy: { runAt: "desc" }, take: 10 });
    return NextResponse.json({ audits });
  } catch (error) {
    return NextResponse.json({ error: "Failed to load audits" }, { status: 500 });
  }
}
