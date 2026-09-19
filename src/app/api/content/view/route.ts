import { NextResponse } from "next/server";
import { getPrimaryTenantId } from "@/lib/tenant-context";
import { incrementPostView } from "@/lib/content/views";
import { isBotUserAgent } from "@/lib/content/view-bots";
import { consumeRateLimit, clientKeyFromRequest } from "@/lib/tools/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const limit = consumeRateLimit(`${clientKeyFromRequest(req)}:content-view`, 40, 10 * 60 * 1000);
  if (!limit.allowed) {
    return NextResponse.json({ ok: false }, { status: 429 });
  }

  if (isBotUserAgent(req.headers.get("user-agent"))) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  try {
    const body = (await req.json()) as { id?: unknown };
    const id = typeof body.id === "string" ? body.id.trim() : "";
    if (!id || id.length > 64) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    const tenantId = await getPrimaryTenantId();
    await incrementPostView(id, tenantId);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true });
  }
}
