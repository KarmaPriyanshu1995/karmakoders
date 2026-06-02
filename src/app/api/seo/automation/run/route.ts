import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateMetaTitle, generateMetaDescription } from "@/lib/seo/aiRecommender";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const [pages, posts, projects] = await Promise.all([
      prisma.page.findMany({ select: { id: true, slug: true, title: true, seoMeta: true } }),
      prisma.post.findMany({ select: { id: true, slug: true, title: true, seoMeta: true, content: true, image: true } }),
      prisma.project.findMany({ select: { id: true, slug: true, title: true } }),
    ]);

    const logs: string[] = [];

    // Auto-generate missing meta titles
    for (const post of posts) {
      const meta = post.seoMeta ? JSON.parse(post.seoMeta) : {};
      if (!meta.title) {
        const generated = generateMetaTitle({ title: post.title, url: `/blog/${post.slug}` });
        await prisma.seoAutomationLog.create({
          data: {
            action: "generate_meta_title",
            pageId: post.id,
            pageType: "post",
            url: `/blog/${post.slug}`,
            before: "Missing",
            after: generated,
            status: "success",
            triggeredBy: "auto",
          },
        });
        logs.push(`Generated meta title for post: ${post.title}`);
      }
      if (!meta.description) {
        const generated = generateMetaDescription({ title: post.title, url: `/blog/${post.slug}` });
        await prisma.seoAutomationLog.create({
          data: {
            action: "generate_meta_description",
            pageId: post.id,
            pageType: "post",
            url: `/blog/${post.slug}`,
            before: "Missing",
            after: generated,
            status: "success",
            triggeredBy: "auto",
          },
        });
        logs.push(`Generated meta description for post: ${post.title}`);
      }
    }

    return NextResponse.json({ success: true, actionsPerformed: logs.length, logs });
  } catch (error) {
    console.error("[SEO Automation]", error);
    return NextResponse.json({ error: "Automation failed" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const logs = await prisma.seoAutomationLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return NextResponse.json({ logs });
  } catch (error) {
    return NextResponse.json({ error: "Failed to load logs" }, { status: 500 });
  }
}
