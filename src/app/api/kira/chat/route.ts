import { NextResponse } from "next/server";
import { buildKiraInstructions } from "@/lib/kira/systemPrompt";
import {
  getOpenRouterApiKey,
  getOpenRouterModel,
  openRouterHeaders,
} from "@/lib/kira/openrouter";
import type { LeadProfile } from "@/lib/kira/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseProfileBlock(reply: string): {
  clean: string;
  profileUpdate: Partial<LeadProfile>;
} {
  let profileUpdate: Partial<LeadProfile> = {};
  let clean = reply;
  const match = clean.match(/<<<PROFILE(\{[\s\S]*?\})>>>/);
  if (match) {
    try {
      profileUpdate = JSON.parse(match[1]);
    } catch {
      profileUpdate = {};
    }
    clean = clean.replace(match[0], "").trim();
  }
  return { clean, profileUpdate };
}

/** Text + voice brain via OpenRouter (free models for testing). */
export async function POST(req: Request) {
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

  try {
    const body = await req.json();
    const pathname = String(body?.pathname || "/");
    const message = String(body?.message || "").trim();
    const history = Array.isArray(body?.history) ? body.history : [];
    const profile = (body?.profile || {}) as LeadProfile;
    const speakIntro = Boolean(body?.speakIntro);

    if (!message && !speakIntro) {
      return NextResponse.json({ error: "Message required." }, { status: 400 });
    }

    const model = getOpenRouterModel();

    const systemText =
      buildKiraInstructions(pathname) +
      `\n\nCurrent lead profile JSON:\n${JSON.stringify(profile)}` +
      `\n\nVoice mode: keep replies to 1–3 spoken sentences, no markdown, end with one question.` +
      `\nWhen you learn new facts, append a JSON block on its own line:` +
      `\n<<<PROFILE{"name":"...","temperature":"WARM"}>>>` +
      `\nOnly include changed fields. Never invent emails or pricing.`;

    const messages: Array<{ role: string; content: string }> = [
      { role: "system", content: systemText },
    ];

    for (const m of history
      .filter((h: { role?: string; content?: string }) => h?.role && h?.content)
      .slice(-12)) {
      messages.push({
        role: m.role === "kira" || m.role === "assistant" ? "assistant" : "user",
        content: m.content,
      });
    }

    messages.push({
      role: "user",
      content:
        message ||
        "They just opened the call. You are Kira, a woman at KarmaKoders. One short spoken hello, then one engaging question. Do not mention AI.",
    });

    const orRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: openRouterHeaders(apiKey),
      body: JSON.stringify({
        model,
        temperature: 0.85,
        messages,
      }),
    });

    const data = await orRes.json();
    if (!orRes.ok) {
      console.error("Kira OpenRouter chat error:", data);
      const msg = data?.error?.message || data?.message || "";
      if (orRes.status === 401 || /api key|unauthorized|invalid/i.test(msg)) {
        return NextResponse.json(
          { error: "OpenRouter API key is invalid. Check OPENROUTER_API_KEY." },
          { status: 401 }
        );
      }
      if (orRes.status === 402 || /credits|payment|billing/i.test(msg)) {
        return NextResponse.json(
          {
            error:
              "OpenRouter needs credits for this model. Use a :free model (e.g. openrouter/free) or add credits.",
          },
          { status: 402 }
        );
      }
      if (orRes.status === 429) {
        return NextResponse.json(
          {
            error:
              "OpenRouter free-model rate limit hit. Wait a minute and try again.",
          },
          { status: 429 }
        );
      }
      return NextResponse.json(
        { error: msg || "Assistant failed to reply." },
        { status: 502 }
      );
    }

    const raw =
      data?.choices?.[0]?.message?.content ||
      "Sorry — I lost that. Could you say it again?";
    const { clean, profileUpdate } = parseProfileBlock(
      typeof raw === "string" ? raw : JSON.stringify(raw)
    );

    return NextResponse.json({
      reply: clean,
      profileUpdate,
      model: data?.model || model,
      provider: "openrouter",
    });
  } catch (error) {
    console.error("Kira chat error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
