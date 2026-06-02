import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { runAudit, AuditPage } from "@/lib/seo/auditEngine";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const [pages, posts, projects] = await Promise.all([
      prisma.page.findMany({ select: { id: true, slug: true, title: true, seoMeta: true, isPublished: true } }),
      prisma.post.findMany({ select: { id: true, slug: true, title: true, seoMeta: true, published: true, content: true } }),
      prisma.project.findMany({ select: { id: true, slug: true, title: true, content: true } }),
    ]);

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

    const result = runAudit(auditPages);

    // Save audit to DB
    const audit = await prisma.seoAudit.create({
      data: {
        totalPages: result.totalPages,
        indexedPages: result.indexedPages,
        nonIndexedPages: result.nonIndexedPages,
        missingTitles: result.missingTitles,
        duplicateTitles: result.duplicateTitles,
        missingDescriptions: result.missingDescriptions,
        duplicateDescriptions: result.duplicateDescriptions,
        missingH1: result.missingH1,
        multipleH1: result.multipleH1,
        missingAlt: result.missingAlt,
        technicalScore: result.technicalScore,
        issuesSummaryJson: JSON.stringify(result.issues.slice(0, 100)),
        status: "complete",
      },
    });

    // Upsert issues
    for (const issue of result.issues) {
      if (issue.pageId) {
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
