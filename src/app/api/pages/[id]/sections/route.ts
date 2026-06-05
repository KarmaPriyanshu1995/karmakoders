import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getPageSectionsPayload, savePageSections } from "@/lib/pageSectionsApi";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const payload = await getPageSectionsPayload(id);
    if (!payload) {
      return NextResponse.json({ error: "Page not found" }, { status: 404 });
    }
    return NextResponse.json(payload);
  } catch (error) {
    console.error("[GET /api/pages/:id/sections]", error);
    return NextResponse.json({ error: "Failed to fetch sections" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { sections, sectionScores } = body;

    if (!Array.isArray(sections)) {
      return NextResponse.json({ error: "sections array required" }, { status: 400 });
    }

    const page = await savePageSections(id, sections, sectionScores);
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
    console.error("[PUT /api/pages/:id/sections]", error);
    return NextResponse.json({ error: "Failed to save sections" }, { status: 500 });
  }
}
