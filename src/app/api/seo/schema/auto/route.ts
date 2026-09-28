import { NextResponse } from "next/server";
import { prisma, withDbRetry } from "@/lib/prisma";
import { requireTenantContext, TenantAccessError } from "@/lib/tenant-context";
import { assertPermission, PERMISSIONS } from "@/lib/permissions";
import { brandInputFromRecord, buildBrandGraphSchemas } from "@/lib/seo/autoJsonLd";
import { entitiesToJsonLd } from "@/lib/seo/entityDetector";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const { tenantId, role, permissionOverrides } = await requireTenantContext();
    assertPermission(role, PERMISSIONS.SEO_UPDATE, permissionOverrides);

    const [brand, entities] = await withDbRetry(() => Promise.all([
      prisma.seoBrand.findFirst({ where: { tenantId } }),
      prisma.seoEntity.findMany({ where: { tenantId } }),
    ]));

    if (!brand) {
      return NextResponse.json({ error: "Save brand details before generating JSON-LD." }, { status: 400 });
    }

    const records = buildBrandGraphSchemas(brandInputFromRecord(brand));
    const entityGraph = entitiesToJsonLd(
      entities.map((e) => ({ name: e.name, type: e.type, confidence: 1 })),
      brand.websiteUrl || undefined
    );

    await withDbRetry(async () => {
      for (const record of records) {
        const suffix = record.schemaType === "Service"
          ? `Service-${(record.schema as { name?: string }).name || "item"}`.toLowerCase().replace(/\s+/g, "-")
          : record.schemaType;
        const id = `site-brand-${tenantId}-${suffix}`;
        await prisma.seoSchema.upsert({
          where: { id },
          create: {
            id,
            tenantId,
            pageType: "site",
            pageId: "brand",
            schemaType: record.schemaType,
            schemaJson: JSON.stringify(record.schema, null, 2),
            isValid: record.validation.valid,
            errorsJson: JSON.stringify(record.validation.errors),
            isApplied: true,
          },
          update: {
            schemaJson: JSON.stringify(record.schema, null, 2),
            isValid: record.validation.valid,
            errorsJson: JSON.stringify(record.validation.errors),
            isApplied: true,
          },
        });
      }

      await prisma.seoBrand.update({
        where: { id: brand.id },
        data: { schemaJson: JSON.stringify(records.map((r) => r.schema)) },
      });
    });

    return NextResponse.json({
      schemas: records,
      entityGraph,
      applied: records.length,
    });
  } catch (error) {
    if (error instanceof TenantAccessError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("[Schema Auto]", error);
    return NextResponse.json({ error: "Failed to auto-generate JSON-LD" }, { status: 500 });
  }
}
