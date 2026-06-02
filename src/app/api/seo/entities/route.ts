import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const entities = await prisma.seoEntity.findMany({ orderBy: { createdAt: "desc" } });
    return NextResponse.json({ entities });
  } catch (error) {
    return NextResponse.json({ error: "Failed to load entities" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const entity = await prisma.seoEntity.create({
      data: {
        type: body.type,
        name: body.name,
        description: body.description || null,
        aliases: body.aliases || null,
        sitewide: body.sitewide ?? true,
      },
    });
    return NextResponse.json({ entity });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create entity" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    await prisma.seoEntity.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete entity" }, { status: 500 });
  }
}
