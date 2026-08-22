import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  generateOrganizationSchema, generateArticleSchema, generateFaqSchema,
  generateServiceSchema, generateBreadcrumbSchema, generateLocalBusinessSchema,
  generatePersonSchema, generateWebsiteSchema, validateSchema,
} from "@/lib/seo/schemaGenerator";
import { requireTenantContext, TenantAccessError, assertOwnership } from "@/lib/tenant-context";
import { assertPermission, PERMISSIONS } from "@/lib/permissions";

export const dynamic = "force-dynamic";

async function verifyPageOwnership(pageType: string, pageId: string, tenantId: string) {
  const delegate = pageType === "post" ? prisma.post : pageType === "project" ? prisma.project : prisma.page;
  const record = await (delegate as typeof prisma.page).findUnique({ where: { id: pageId }, select: { tenantId: true } });
  if (!record) throw new TenantAccessError("Referenced content not found");
  assertOwnership(record.tenantId, tenantId);
}

export async function POST(req: NextRequest) {
  try {
    const { tenantId, role } = await requireTenantContext();
    assertPermission(role, PERMISSIONS.SEO_UPDATE);

    const body = await req.json();
    const { schemaType, pageId, pageType, data } = body;

    let schema: object;

    switch (schemaType) {
      case "Organization":
        schema = generateOrganizationSchema(data);
        break;
      case "Website":
        schema = generateWebsiteSchema(data);
        break;
      case "Article":
        schema = generateArticleSchema(data);
        break;
      case "FAQ":
        schema = generateFaqSchema(data);
        break;
      case "Service":
        schema = generateServiceSchema(data);
        break;
      case "Breadcrumb":
        schema = generateBreadcrumbSchema(data);
        break;
      case "LocalBusiness":
        schema = generateLocalBusinessSchema(data);
        break;
      case "Person":
        schema = generatePersonSchema(data);
        break;
      default:
        return NextResponse.json({ error: "Unknown schema type" }, { status: 400 });
    }

    const validation = validateSchema(schema);

    // Save to DB if pageId provided
    if (pageId && pageType) {
      await verifyPageOwnership(pageType, pageId, tenantId);

      const id = `${pageType}-${pageId}-${schemaType}`;
      await prisma.seoSchema.upsert({
        where: { id },
        create: {
          id,
          tenantId,
          pageType,
          pageId,
          schemaType,
          schemaJson: JSON.stringify(schema, null, 2),
          isValid: validation.valid,
          errorsJson: JSON.stringify(validation.errors),
        },
        update: {
          schemaJson: JSON.stringify(schema, null, 2),
          isValid: validation.valid,
          errorsJson: JSON.stringify(validation.errors),
        },
      });
    }

    return NextResponse.json({ schema, validation, json: JSON.stringify(schema, null, 2) });
  } catch (error) {
    if (error instanceof TenantAccessError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("[Schema Generate]", error);
    return NextResponse.json({ error: "Schema generation failed" }, { status: 500 });
  }
}
