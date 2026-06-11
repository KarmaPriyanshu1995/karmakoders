import { NextRequest, NextResponse } from "next/server";
import { applyRecommendation, ApplyLinkError } from "@/lib/seo/internalLinkService";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const recommendationId = body?.recommendationId;

    if (!recommendationId || typeof recommendationId !== "string") {
      return NextResponse.json(
        { error: "recommendationId is required" },
        { status: 400 }
      );
    }

    const result = await applyRecommendation(recommendationId);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ApplyLinkError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error("[SEO Internal Links Apply]", error);
    return NextResponse.json(
      { error: "Failed to apply internal link" },
      { status: 500 }
    );
  }
}
