import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateMetaTitle, generateMetaDescription, generateFaqQuestions, generateContentImprovements, generateEEATImprovements } from "@/lib/seo/aiRecommender";
import { requireTenantContext, TenantAccessError } from "@/lib/tenant-context";
import { assertPermission, PERMISSIONS } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { tenantId, role, permissionOverrides } = await requireTenantContext();
    assertPermission(role, PERMISSIONS.SEO_VIEW, permissionOverrides);

    const body = await req.json();
    const { action, pageId, pageType, context } = body;

    let result: unknown;

    switch (action) {
      case "generate_title":
        result = { title: generateMetaTitle(context) };
        break;
      case "generate_description":
        result = { description: generateMetaDescription(context) };
        break;
      case "generate_faqs":
        result = { faqs: generateFaqQuestions(context) };
        break;
      case "generate_content_improvements":
        result = { improvements: generateContentImprovements(context) };
        break;
      case "generate_eeat":
        result = { eeat: generateEEATImprovements(context) };
        break;
      case "generate_all": {
        result = {
          title: generateMetaTitle(context),
          description: generateMetaDescription(context),
          faqs: generateFaqQuestions(context),
          improvements: generateContentImprovements(context),
          eeat: generateEEATImprovements(context),
        };
        break;
      }
      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }

    // Log automation action
    if (pageId && pageType) {
      await prisma.seoAutomationLog.create({
        data: {
          tenantId,
          action,
          pageId,
          pageType,
          status: "success",
          triggeredBy: "manual",
          after: JSON.stringify(result),
        },
      });
    }

    return NextResponse.json({ result });
  } catch (error) {
    if (error instanceof TenantAccessError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("[AI Recommend]", error);
    return NextResponse.json({ error: "Recommendation failed" }, { status: 500 });
  }
}
