import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { clearRemoteEntityCache } from "@/lib/seo/entityDetector";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const entities = await prisma.seoEntity.findMany({ orderBy: { createdAt: "desc" } });
    return NextResponse.json({ entities });
  } catch (error) {
    return NextResponse.json({ error: "Failed to load entities" }, { status: 500 });
  }
}

const VALID_ENTITY_TYPES = new Set([
  "brand", "person", "service", "product", "location", "topic", "keyword", "technology",
]);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const type = typeof body.type === "string" ? body.type.trim() : "";

    if (!name) {
      return NextResponse.json({ error: "Entity name is required" }, { status: 400 });
    }
    if (!type || !VALID_ENTITY_TYPES.has(type)) {
      return NextResponse.json({ error: "A valid entity type is required" }, { status: 400 });
    }

    const entity = await prisma.seoEntity.create({
      data: {
        type,
        name,
        description: typeof body.description === "string" && body.description.trim() ? body.description.trim() : null,
        aliases: typeof body.aliases === "string" && body.aliases.trim() ? body.aliases.trim() : null,
        sitewide: body.sitewide ?? true,
      },
    });
    clearRemoteEntityCache();
    return NextResponse.json({ entity }, { status: 201 });
  } catch (error) {
    console.error("[SEO Entities POST]", error);
    return NextResponse.json({ error: "Failed to create entity" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    await prisma.seoEntity.delete({ where: { id } });
    clearRemoteEntityCache();
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete entity" }, { status: 500 });
  }
}
