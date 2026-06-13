import { NextResponse } from "next/server";
import { getRecommendations } from "@/lib/seo/internalLinkService";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const result = await getRecommendations();
    return NextResponse.json(result);
  } catch (error) {
    console.error("[SEO Internal Links GET]", error);
    return NextResponse.json(
      { error: "Failed to load recommendations" },
      { status: 500 }
    );
  }
}
