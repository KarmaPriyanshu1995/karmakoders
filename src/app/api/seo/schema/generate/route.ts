import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  generateOrganizationSchema, generateArticleSchema, generateFaqSchema,
  generateServiceSchema, generateBreadcrumbSchema, generateLocalBusinessSchema,
  generatePersonSchema, generateWebsiteSchema, validateSchema,
} from "@/lib/seo/schemaGenerator";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
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
      await prisma.seoSchema.upsert({
        where: {
          id: `${pageType}-${pageId}-${schemaType}`,
        },
        create: {
          id: `${pageType}-${pageId}-${schemaType}`,
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
    console.error("[Schema Generate]", error);
    return NextResponse.json({ error: "Schema generation failed" }, { status: 500 });
  }
}
