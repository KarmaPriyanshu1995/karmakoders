import { NextRequest, NextResponse } from "next/server";
import { prisma, withDbRetry } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [schemas, pages, posts] = await withDbRetry(() => Promise.all([
      prisma.seoSchema.findMany({ orderBy: { updatedAt: "desc" } }),
      prisma.page.findMany({ select: { id: true, title: true, slug: true } }),
      prisma.post.findMany({ select: { id: true, title: true, slug: true } }),
    ]));

    const pageMap = new Map(pages.map((p) => [p.id, p]));
    const postMap = new Map(posts.map((p) => [p.id, p]));

    const result = schemas.map((s) => {
      let pageTitle = "Global/Unknown";
      let pageSlug = "";

      if (s.pageType === "page") {
        const p = pageMap.get(s.pageId);
        if (p) {
          pageTitle = p.title;
          pageSlug = p.slug;
        }
      } else if (s.pageType === "post") {
        const p = postMap.get(s.pageId);
        if (p) {
          pageTitle = p.title;
          pageSlug = p.slug;
        }
      }

      return {
        id: s.id,
        pageId: s.pageId,
        pageType: s.pageType,
        pageTitle,
        pageSlug,
        schemaType: s.schemaType,
        schemaJson: s.schemaJson,
        isValid: s.isValid,
        errors: s.errorsJson ? JSON.parse(s.errorsJson) : [],
        isApplied: s.isApplied,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
      };
    });

    return NextResponse.json({ schemas: result });
  } catch (error) {
    console.error("[SEO Schema GET]", error);
    return NextResponse.json({ error: "Failed to load schema markup data" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing schema id" }, { status: 400 });
    }

    await withDbRetry(() => prisma.seoSchema.delete({ where: { id } }));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[SEO Schema DELETE]", error);
    return NextResponse.json({ error: "Failed to delete schema markup" }, { status: 500 });
  }
}
