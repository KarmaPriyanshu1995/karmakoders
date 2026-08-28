import { NextResponse } from "next/server";
import { getPrimaryTenantId } from "@/lib/tenant-context";
import { recordToolEvent, TOOL_EVENTS } from "@/lib/tools/analytics";
import { prisma } from "@/lib/prisma";
import { parseDomainInput } from "@/lib/tools/domain";
import { consumeRateLimit, clientKeyFromRequest } from "@/lib/tools/rate-limit";

export const dynamic = "force-dynamic";

const ALLOWED = new Set(Object.values(TOOL_EVENTS));

export async function POST(req: Request) {
  const limit = consumeRateLimit(`${clientKeyFromRequest(req)}:tools-events`, 60, 10 * 60 * 1000);
  if (!limit.allowed) {
    return NextResponse.json({ ok: false }, { status: 429 });
  }

  try {
    const body = (await req.json()) as Record<string, unknown>;
    const eventType = typeof body.eventType === "string" ? body.eventType : "";
    if (!ALLOWED.has(eventType as (typeof TOOL_EVENTS)[keyof typeof TOOL_EVENTS])) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    const tenantId = await getPrimaryTenantId();
    const toolSlug = typeof body.toolSlug === "string" ? body.toolSlug.slice(0, 80) : "";
    const providerSlug = typeof body.providerSlug === "string" ? body.providerSlug.slice(0, 80) : "";
    const domainRaw = typeof body.domain === "string" ? body.domain : "";
    const parsed = domainRaw ? parseDomainInput(domainRaw) : null;

    const tool = toolSlug
      ? await prisma.freeTool.findFirst({ where: { tenantId, slug: toolSlug }, select: { id: true } })
      : null;
    const provider = providerSlug
      ? await prisma.domainProvider.findFirst({ where: { tenantId, slug: providerSlug }, select: { id: true } })
      : null;

    await recordToolEvent({
      tenantId,
      eventType,
      toolId: tool?.id,
      providerId: provider?.id,
      domain: parsed?.ok ? parsed.value.domain : null,
      tld: parsed?.ok ? parsed.value.tld : typeof body.tld === "string" ? body.tld.slice(0, 32) : null,
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
