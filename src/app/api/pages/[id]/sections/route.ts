import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getPageSectionsPayload, savePageSections } from "@/lib/pageSectionsApi";
import { requireTenantContext, TenantAccessError } from "@/lib/tenant-context";
import { assertPermission, PERMISSIONS } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { tenantId, role } = await requireTenantContext();
    assertPermission(role, PERMISSIONS.PAGE_VIEW);
    const { id } = await params;
    const payload = await getPageSectionsPayload(id, tenantId);
    if (!payload) {
      return NextResponse.json({ error: "Page not found" }, { status: 404 });
    }
    return NextResponse.json(payload);
  } catch (error) {
    if (error instanceof TenantAccessError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("[GET /api/pages/:id/sections]", error);
    return NextResponse.json({ error: "Failed to fetch sections" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { tenantId, role } = await requireTenantContext();
    assertPermission(role, PERMISSIONS.PAGE_UPDATE);
    const { id } = await params;
    const body = await req.json();
    const { sections, sectionScores } = body;

    if (!Array.isArray(sections)) {
      return NextResponse.json({ error: "sections array required" }, { status: 400 });
    }

    const page = await savePageSections(id, sections, tenantId, sectionScores);
    if (!page) {
      return NextResponse.json({ error: "Page not found" }, { status: 404 });
    }

    revalidatePath(`/admin/pages/${id}`);
    revalidatePath("/");
    if (page.slug === "home") {
      revalidatePath("/");
    } else {
      revalidatePath(`/${page.slug}`);
    }

    return NextResponse.json({ success: true, pageId: id });
  } catch (error) {
    if (error instanceof TenantAccessError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("[PUT /api/pages/:id/sections]", error);
    return NextResponse.json({ error: "Failed to save sections" }, { status: 500 });
  }
}
