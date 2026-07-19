import { NextResponse } from "next/server";
import { prisma, withDbRetry } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [seoPages, contentGaps] = await withDbRetry(() => Promise.all([
      prisma.seoPage.findMany({
        select: {
          id: true,
          pageType: true,
          pageId: true,
          url: true,
          title: true,
          wordCount: true,
          readabilityScore: true,
          hasFaq: true,
          contentScore: true,
          overallScore: true,
          issuesJson: true,
          recommendationsJson: true,
        },
        orderBy: { contentScore: "desc" },
      }),
      prisma.seoContentGap.findMany({
        orderBy: { priority: "asc" },
      }),
    ]));

    // Format issues and recommendations
    const pages = seoPages.map((page) => ({
      id: page.pageId,
      type: page.pageType,
      url: page.url,
      title: page.title || "Untitled",
      wordCount: page.wordCount,
      readabilityScore: page.readabilityScore,
      hasFaq: page.hasFaq,
      contentScore: page.contentScore,
      overallScore: page.overallScore,
      issues: page.issuesJson ? JSON.parse(page.issuesJson) : [],
      recommendations: page.recommendationsJson ? JSON.parse(page.recommendationsJson) : [],
    }));

    const totalPages = pages.length;
    const avgContentScore = totalPages
      ? Math.round(pages.reduce((acc, p) => acc + p.contentScore, 0) / totalPages)
      : 0;
    const thinContentCount = pages.filter((p) => p.wordCount < 600).length;
    const missingFaqCount = pages.filter((p) => !p.hasFaq).length;

    return NextResponse.json({
      pages,
      gaps: contentGaps,
      stats: {
        avgContentScore,
        thinContentCount,
        missingFaqCount,
      },
    });
  } catch (error) {
    console.error("[SEO Content GET]", error);
    return NextResponse.json({ error: "Failed to load content intelligence data" }, { status: 500 });
  }
}
