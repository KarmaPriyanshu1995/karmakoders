import { NextResponse } from "next/server";
import { prisma, withDbRetry } from "@/lib/prisma";
import { syncSitePages } from "@/lib/actions";
import { buildPageUrl } from "@/lib/sitePages";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await withDbRetry(() => syncSitePages());

    const [pages, posts, projects] = await withDbRetry(() => Promise.all([
      prisma.page.findMany({ select: { id: true, slug: true, title: true, seoMeta: true } }),
      prisma.post.findMany({ select: { id: true, slug: true, title: true, seoMeta: true, content: true, image: true } }),
      prisma.project.findMany({ select: { id: true, slug: true, title: true, content: true } }),
    ]));

    const seoPages = await withDbRetry(() => prisma.seoPage.findMany());
    const seoMap = new Map(seoPages.map((sp) => [`${sp.pageType}:${sp.pageId}`, sp]));

    const allPages = [
      ...pages.map((p) => {
        const meta = p.seoMeta ? JSON.parse(p.seoMeta) : {};
        return { id: p.id, type: "page", slug: p.slug, title: p.title, metaTitle: meta.title, metaDescription: meta.description, content: null };
      }),
      ...posts.map((p) => {
        const meta = p.seoMeta ? JSON.parse(p.seoMeta) : {};
        return { id: p.id, type: "post", slug: p.slug, title: p.title, metaTitle: meta.title, metaDescription: meta.description, content: p.content };
      }),
      ...projects.map((p) => ({
        id: p.id, type: "project", slug: p.slug, title: p.title, metaTitle: null, metaDescription: null, content: p.content,
      })),
    ];

    const result = allPages.map((page) => {
      const key = `${page.type}:${page.id}`;
      const existing = seoMap.get(key);
      const url = buildPageUrl(page.slug, page.type as "page" | "post" | "project");

      const issues = existing?.issuesJson ? JSON.parse(existing.issuesJson) : [];

      return {
        id: page.id,
        type: page.type,
        url,
        title: page.title,
        metaTitle: page.metaTitle,
        metaDescription: page.metaDescription,
        overallScore: existing?.overallScore ?? 0,
        technicalScore: existing?.technicalScore ?? 0,
        contentScore: existing?.contentScore ?? 0,
        entityScore: existing?.entityScore ?? 0,
        schemaScore: existing?.schemaScore ?? 0,
        internalLinkScore: existing?.internalLinkScore ?? 0,
        ctrScore: existing?.ctrScore ?? 0,
        wordCount: existing?.wordCount ?? 0,
        hasFaq: existing?.hasFaq ?? false,
        hasSchema: existing?.hasSchema ?? false,
        isOrphan: existing?.isOrphan ?? false,
        internalLinksCount: existing?.internalLinksCount ?? 0,
        lastAnalyzed: existing?.lastAnalyzed ?? null,
        issues,
        issueCount: issues.length,
      };
    });

    return NextResponse.json({ pages: result });
  } catch (error) {
    console.error("[SEO Pages]", error);
    return NextResponse.json({ error: "Failed to load pages" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, type, metaTitle, metaDescription } = body;

    const seoMeta = JSON.stringify({ title: metaTitle, description: metaDescription });

    await withDbRetry(async () => {
      if (type === "post") {
        await prisma.post.update({ where: { id }, data: { seoMeta } });
      } else if (type === "page") {
        await prisma.page.update({ where: { id }, data: { seoMeta } });
      } else if (type === "project") {
        // Project table does not store seoMeta column in prisma.prisma directly
      }

      // Update in seo_pages table if it exists
      await prisma.seoPage.updateMany({
        where: { pageType: type, pageId: id },
        data: {
          metaTitle,
          metaDescription,
          lastAnalyzed: new Date(),
        },
      });

      // Create an automation log entry
      await prisma.seoAutomationLog.create({
        data: {
          action: `Optimized metadata for ${type}: ${id}`,
          pageId: id,
          pageType: type,
          before: "Old metadata",
          after: `Title: ${metaTitle} | Desc: ${metaDescription}`,
          status: "success",
          triggeredBy: "user",
        },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[SEO PUT Pages]", error);
    return NextResponse.json({ error: "Failed to update page metadata" }, { status: 500 });
  }
}

