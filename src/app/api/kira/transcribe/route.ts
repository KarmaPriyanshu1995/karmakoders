import { NextResponse } from "next/server";
import { getOpenRouterApiKey, getOpenRouterModel } from "@/lib/kira/openrouter";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function siteHeaders(apiKey: string) {
  const site = process.env.NEXT_PUBLIC_SITE_URL || "https://www.karmakoders.com";
  return {
    Authorization: `Bearer ${apiKey}`,
    "HTTP-Referer": site,
    "X-Title": "KarmaKoders Kira",
  };
}

async function transcribeWithWhisper(apiKey: string, file: File): Promise<string | null> {
  const models = [
    process.env.KIRA_STT_MODEL,
    "openai/whisper-large-v3",
    "openai/whisper-large-v3-turbo",
    "whisper-1",
  ].filter(Boolean) as string[];

  for (const model of models) {
    const fd = new FormData();
    fd.set("file", file, file.name || "speech.webm");
    fd.set("model", model);
    const res = await fetch("https://openrouter.ai/api/v1/audio/transcriptions", {
      method: "POST",
      headers: siteHeaders(apiKey),
      body: fd,
    });
    const data = await res.json().catch(() => ({}));
    const text = String(data?.text || data?.result || "").trim();
    if (res.ok && text) return text;
    console.error("Kira whisper transcribe failed:", model, res.status, data);
  }
  return null;
}

async function transcribeWithChat(apiKey: string, file: File): Promise<string | null> {
  const bytes = Buffer.from(await file.arrayBuffer());
  const b64 = bytes.toString("base64");
  const mime = file.type || "audio/webm";
  const model = process.env.KIRA_TEXT_MODEL || getOpenRouterModel();

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      ...siteHeaders(apiKey),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Transcribe the spoken words in this audio. Return only the transcript, nothing else. If you cannot hear speech, return EMPTY.",
            },
            {
              type: "input_audio",
              input_audio: {
                data: b64,
                format: mime.includes("wav") ? "wav" : "webm",
              },
            },
          ],
        },
      ],
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error("Kira chat transcribe failed:", data);
    return null;
  }
  const text = String(data?.choices?.[0]?.message?.content || "").trim();
  if (!text || /^empty$/i.test(text)) return null;
  return text.replace(/^["']|["']$/g, "").trim();
}

export async function POST(req: Request) {
  const apiKey = getOpenRouterApiKey();
  if (!apiKey) {
    return NextResponse.json({ error: "OpenRouter key missing." }, { status: 503 });
  }

  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File) || file.size < 800) {
      return NextResponse.json({ error: "No speech captured. Tap Speak and try again." }, { status: 400 });
    }

    const text =
      (await transcribeWithWhisper(apiKey, file)) ||
      (await transcribeWithChat(apiKey, file));

    if (!text) {
      return NextResponse.json(
        { error: "Could not understand that. Tap Speak and try once more." },
        { status: 422 }
      );
    }

    return NextResponse.json({ text });
  } catch (error) {
    console.error("Kira transcribe error:", error);
    return NextResponse.json({ error: "Transcription failed." }, { status: 500 });
  }
}
