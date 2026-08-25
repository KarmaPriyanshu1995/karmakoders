import { NextRequest, NextResponse } from "next/server";
import { prisma, withDbRetry } from "@/lib/prisma";
import { clearRemoteEntityCache } from "@/lib/seo/entityDetector";
import { requireTenantContext, TenantAccessError } from "@/lib/tenant-context";
import { assertPermission, PERMISSIONS } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { tenantId, role, permissionOverrides } = await requireTenantContext();
    assertPermission(role, PERMISSIONS.SEO_VIEW, permissionOverrides);

    let entities = await withDbRetry(() => prisma.seoEntity.findMany({ where: { tenantId }, orderBy: { createdAt: "desc" } }));

    if (entities.length === 0) {
      const defaultEntities = [
        { type: "brand", name: "karmakoders", description: "Premium Next-gen Web & AI engineering agency", sitewide: true },
        { type: "person", name: "Priyanshu Singh", description: "Founder and Chief Architect at karmakoders", sitewide: true },
        { type: "technology", name: "Next.js", description: "React Framework for Production", sitewide: true },
        { type: "technology", name: "React", description: "JavaScript library for user interfaces", sitewide: true },
        { type: "technology", name: "TypeScript", description: "Typed superset of JavaScript", sitewide: true },
        { type: "technology", name: "Prisma", description: "Next-generation Node.js & TypeScript ORM", sitewide: true },
        { type: "service", name: "Web Engineering", description: "Custom web development using React & Next.js", sitewide: true },
        { type: "service", name: "AI Automation", description: "Custom AI integrations and business process agents", sitewide: true },
        { type: "service", name: "UI/UX Design", description: "Futuristic, premium design systems", sitewide: true }
      ];

      await withDbRetry(() =>
        prisma.seoEntity.createMany({ data: defaultEntities.map((e) => ({ ...e, tenantId })) })
      );

      entities = await withDbRetry(() => prisma.seoEntity.findMany({ where: { tenantId }, orderBy: { createdAt: "desc" } }));
    }

    return NextResponse.json({ entities });
  } catch (error) {
    if (error instanceof TenantAccessError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("[SEO Entities GET]", error);
    return NextResponse.json({ error: "Failed to load entities" }, { status: 500 });
  }
}

const VALID_ENTITY_TYPES = new Set([
  "brand", "person", "service", "product", "location", "topic", "keyword", "technology",
]);

export async function POST(req: NextRequest) {
  try {
    const { tenantId, role, permissionOverrides } = await requireTenantContext();
    assertPermission(role, PERMISSIONS.SEO_UPDATE, permissionOverrides);

    const body = await req.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const type = typeof body.type === "string" ? body.type.trim() : "";

    if (!name) {
      return NextResponse.json({ error: "Entity name is required" }, { status: 400 });
    }
    if (!type || !VALID_ENTITY_TYPES.has(type)) {
      return NextResponse.json({ error: "A valid entity type is required" }, { status: 400 });
    }

    const entity = await withDbRetry(() => prisma.seoEntity.create({
      data: {
        tenantId,
        type,
        name,
        description: typeof body.description === "string" && body.description.trim() ? body.description.trim() : null,
        aliases: typeof body.aliases === "string" && body.aliases.trim() ? body.aliases.trim() : null,
        sitewide: body.sitewide ?? true,
      },
    }));
    clearRemoteEntityCache();
    return NextResponse.json({ entity }, { status: 201 });
  } catch (error) {
    if (error instanceof TenantAccessError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("[SEO Entities POST]", error);
    return NextResponse.json({ error: "Failed to create entity" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { tenantId, role, permissionOverrides } = await requireTenantContext();
    assertPermission(role, PERMISSIONS.SEO_UPDATE, permissionOverrides);

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    const { count } = await withDbRetry(() => prisma.seoEntity.deleteMany({ where: { id, tenantId } }));
    if (count === 0) return NextResponse.json({ error: "Entity not found" }, { status: 404 });
    clearRemoteEntityCache();
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof TenantAccessError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: "Failed to delete entity" }, { status: 500 });
  }
}
