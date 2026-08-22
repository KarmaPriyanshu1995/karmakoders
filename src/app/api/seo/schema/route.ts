import { NextRequest, NextResponse } from "next/server";
import { prisma, withDbRetry } from "@/lib/prisma";
import { requireTenantContext, TenantAccessError } from "@/lib/tenant-context";
import { assertPermission, PERMISSIONS } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { tenantId, role } = await requireTenantContext();
    assertPermission(role, PERMISSIONS.SEO_VIEW);

    const [schemas, pages, posts] = await withDbRetry(() => Promise.all([
      prisma.seoSchema.findMany({ where: { tenantId }, orderBy: { updatedAt: "desc" } }),
      prisma.page.findMany({ where: { tenantId }, select: { id: true, title: true, slug: true } }),
      prisma.post.findMany({ where: { tenantId }, select: { id: true, title: true, slug: true } }),
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
    if (error instanceof TenantAccessError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("[SEO Schema GET]", error);
    return NextResponse.json({ error: "Failed to load schema markup data" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { tenantId, role } = await requireTenantContext();
    assertPermission(role, PERMISSIONS.SEO_UPDATE);

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing schema id" }, { status: 400 });
    }

    const { count } = await withDbRetry(() => prisma.seoSchema.deleteMany({ where: { id, tenantId } }));
    if (count === 0) {
      return NextResponse.json({ error: "Schema not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof TenantAccessError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("[SEO Schema DELETE]", error);
    return NextResponse.json({ error: "Failed to delete schema markup" }, { status: 500 });
  }
}
