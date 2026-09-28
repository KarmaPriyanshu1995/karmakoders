import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildPageUrl } from "@/lib/sitePages";
import { analyzePage, extractPageHtmlFromSections } from "@/lib/seo/analyzer";
import {
  generateMetaTitle,
  generateMetaDescription,
  generateFaqQuestions,
  generateContentImprovements,
  generateEEATImprovements,
  type PageContext,
} from "@/lib/seo/aiRecommender";
import { requireTenantContext, TenantAccessError } from "@/lib/tenant-context";
import { assertPermission, PERMISSIONS } from "@/lib/permissions";

export const dynamic = "force-dynamic";

async function loadPageContext(
  tenantId: string,
  pageId: string,
  pageType: string
): Promise<PageContext> {
  if (pageType === "post") {
    const post = await prisma.post.findFirst({ where: { id: pageId, tenantId } });
    if (!post) throw new TenantAccessError("Referenced content not found");
    const meta = post.seoMeta ? JSON.parse(post.seoMeta) : {};
    const analysis = analyzePage({
      title: post.title,
      metaTitle: meta.title || null,
      metaDescription: meta.description || null,
      content: post.content,
      slug: post.slug,
    });
    return {
      url: buildPageUrl(post.slug, "post"),
      title: post.title,
      metaTitle: analysis.metaTitle,
      metaDescription: analysis.metaDescription,
      h1: analysis.h1,
      wordCount: analysis.wordCount,
      primaryKeyword: Object.keys(analysis.keywordDensity)[0] || undefined,
      pageType,
      topKeywords: Object.keys(analysis.keywordDensity).slice(0, 5),
      hasFaq: analysis.hasFaq,
      hasSchema: false,
      readabilityScore: analysis.readabilityScore,
      issues: analysis.issues,
    };
  }

  if (pageType === "project") {
    const project = await prisma.project.findFirst({ where: { id: pageId, tenantId } });
    if (!project) throw new TenantAccessError("Referenced content not found");
    const analysis = analyzePage({
      title: project.title,
      content: project.content,
      slug: project.slug,
    });
    return {
      url: buildPageUrl(project.slug, "project"),
      title: project.title,
      metaTitle: analysis.metaTitle,
      metaDescription: analysis.metaDescription,
      h1: analysis.h1,
      wordCount: analysis.wordCount,
      primaryKeyword: Object.keys(analysis.keywordDensity)[0] || undefined,
      pageType,
      topKeywords: Object.keys(analysis.keywordDensity).slice(0, 5),
      hasFaq: analysis.hasFaq,
      hasSchema: false,
      readabilityScore: analysis.readabilityScore,
      issues: analysis.issues,
    };
  }

  const page = await prisma.page.findFirst({
    where: { id: pageId, tenantId },
    include: { sections: { orderBy: { order: "asc" } } },
  });
  if (!page) throw new TenantAccessError("Referenced content not found");
  const meta = page.seoMeta ? JSON.parse(page.seoMeta) : {};
  const html = extractPageHtmlFromSections(page.sections.map((s) => ({ content: s.content })));
  const analysis = analyzePage({
    title: page.title,
    metaTitle: meta.title || null,
    metaDescription: meta.description || null,
    content: html,
    slug: page.slug,
  });
  return {
    url: buildPageUrl(page.slug, "page"),
    title: page.title,
    metaTitle: analysis.metaTitle,
    metaDescription: analysis.metaDescription,
    h1: analysis.h1,
    wordCount: analysis.wordCount,
    primaryKeyword: Object.keys(analysis.keywordDensity)[0] || undefined,
    pageType: "page",
    topKeywords: Object.keys(analysis.keywordDensity).slice(0, 5),
    hasFaq: analysis.hasFaq,
    hasSchema: false,
    readabilityScore: analysis.readabilityScore,
      issues: analysis.issues,
    };
  }

export async function POST(req: NextRequest) {
  try {
    const { tenantId, role, permissionOverrides } = await requireTenantContext();
    assertPermission(role, PERMISSIONS.SEO_VIEW, permissionOverrides);

    const body = await req.json();
    const { action, pageId, pageType, context } = body as {
      action?: string;
      pageId?: string;
      pageType?: string;
      context?: PageContext;
    };

    let pageContext: PageContext = {
      url: context?.url || "/",
      title: context?.title,
      metaTitle: context?.metaTitle,
      metaDescription: context?.metaDescription,
      wordCount: context?.wordCount,
      hasFaq: context?.hasFaq,
      hasSchema: context?.hasSchema,
      pageType: context?.pageType || pageType,
    };

    if (pageId && pageType) {
      pageContext = await loadPageContext(tenantId, pageId, pageType);
    }

    let result: unknown;

    switch (action) {
      case "generate_title":
        result = { title: generateMetaTitle(pageContext) };
        break;
      case "generate_description":
        result = { description: generateMetaDescription(pageContext) };
        break;
      case "generate_faqs":
        result = { faqs: generateFaqQuestions(pageContext) };
        break;
      case "generate_content_improvements":
        result = { improvements: generateContentImprovements(pageContext) };
        break;
      case "generate_eeat":
        result = { eeat: generateEEATImprovements(pageContext) };
        break;
      case "generate_all": {
        result = {
          title: generateMetaTitle(pageContext),
          description: generateMetaDescription(pageContext),
          faqs: generateFaqQuestions(pageContext),
          improvements: generateContentImprovements(pageContext),
          eeat: generateEEATImprovements(pageContext),
          analysis: {
            wordCount: pageContext.wordCount,
            hasFaq: pageContext.hasFaq,
            readabilityScore: pageContext.readabilityScore,
            issues: pageContext.issues || [],
          },
        };
        break;
      }
      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }

    if (pageId && pageType) {
      await prisma.seoAutomationLog.create({
        data: {
          tenantId,
          action: action || "generate_all",
          pageId,
          pageType,
          status: "success",
          triggeredBy: "manual",
          after: JSON.stringify(result),
        },
      });
    }

    return NextResponse.json({ result, context: pageContext });
  } catch (error) {
    if (error instanceof TenantAccessError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("[AI Recommend]", error);
    return NextResponse.json({ error: "Recommendation failed" }, { status: 500 });
  }
}
