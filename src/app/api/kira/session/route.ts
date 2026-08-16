import { NextResponse } from "next/server";
import { getOpenRouterApiKey, getOpenRouterModel } from "@/lib/kira/openrouter";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * OpenRouter has no realtime speech API.
 * Session endpoint just validates config; the browser uses Web Speech + /api/kira/chat.
 */
export async function POST() {
  if (process.env.KIRA_ENABLED === "false") {
    return NextResponse.json({ error: "Kira is disabled." }, { status: 503 });
  }

  const apiKey = getOpenRouterApiKey();
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "OpenRouter key missing. Add OPENROUTER_API_KEY to .env.local and restart.",
      },
      { status: 503 }
    );
  }

  return NextResponse.json({
    provider: "openrouter",
    mode: "browser-voice",
    model: getOpenRouterModel(),
    ok: true,
  });
}
