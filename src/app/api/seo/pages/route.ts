import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { analyzePage } from "@/lib/seo/analyzer";
import { calcPageScores } from "@/lib/seo/scorer";
import { detectEntities, calcEntityScore } from "@/lib/seo/entityDetector";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [pages, posts, projects] = await Promise.all([
      prisma.page.findMany({ select: { id: true, slug: true, title: true, seoMeta: true } }),
      prisma.post.findMany({ select: { id: true, slug: true, title: true, seoMeta: true, content: true, image: true } }),
      prisma.project.findMany({ select: { id: true, slug: true, title: true, content: true } }),
    ]);

    const seoPages = await prisma.seoPage.findMany();
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
      const url = page.type === "post" ? `/blog/${page.slug}` : page.type === "project" ? `/projects/${page.slug}` : `/${page.slug === "home" ? "" : page.slug}`;

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
        lastAnalyzed: existing?.lastAnalyzed ?? null,
        issueCount: existing?.issuesJson ? JSON.parse(existing.issuesJson).length : 0,
      };
    });

    return NextResponse.json({ pages: result });
  } catch (error) {
    console.error("[SEO Pages]", error);
    return NextResponse.json({ error: "Failed to load pages" }, { status: 500 });
  }
}
