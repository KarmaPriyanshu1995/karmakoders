import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getPrimaryTenantId } from "@/lib/tenant-context";
import { appendDomainToTrackingUrl, isSafeRedirectUrl, sanitizeSessionId } from "@/lib/tools/affiliate";
import { parseDomainInput } from "@/lib/tools/domain";
import { recordToolEvent } from "@/lib/tools/analytics";

export const dynamic = "force-dynamic";

function randomSessionId() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function GET(req: Request, ctx: { params: Promise<{ provider: string }> }) {
  const { provider: providerSlug } = await ctx.params;
  const slug = providerSlug.toLowerCase().replace(/[^a-z0-9-]/g, "");
  const url = new URL(req.url);
  const domainParam = url.searchParams.get("domain");
  const toolSlug = url.searchParams.get("tool") || "domain-compare";

  if (!slug) {
    return NextResponse.redirect(new URL("/free-tools/domain-compare", req.url));
  }

  const tenantId = await getPrimaryTenantId();
  const provider = await prisma.domainProvider.findFirst({
    where: { tenantId, slug, status: "active" },
  });

  if (!provider || !provider.affiliateEnabled) {
    const fallback = provider?.websiteUrl;
    if (fallback && isSafeRedirectUrl(fallback)) {
      return NextResponse.redirect(fallback);
    }
    return NextResponse.redirect(new URL("/free-tools/domain-compare", req.url));
  }

  const program = await prisma.affiliateProgram.findFirst({
    where: { tenantId, providerId: provider.id, status: "active" },
    orderBy: { updatedAt: "desc" },
  });

  const destination = program?.trackingUrl || provider.websiteUrl || "";
  if (!isSafeRedirectUrl(destination)) {
    return NextResponse.redirect(new URL("/free-tools/domain-compare", req.url));
  }

  const parsed = domainParam ? parseDomainInput(domainParam) : null;
  const domain = parsed?.ok ? parsed.value.domain : null;

  const jar = await cookies();
  let sessionId = sanitizeSessionId(jar.get("kk_tool_sid")?.value);
  if (!sessionId) {
    sessionId = randomSessionId();
    jar.set("kk_tool_sid", sessionId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 90,
    });
  }

  const tool = await prisma.freeTool.findFirst({
    where: { tenantId, slug: toolSlug },
    select: { id: true },
  });

  const referrer = req.headers.get("referer")?.slice(0, 500) || null;

  await prisma.affiliateClick.create({
    data: {
      tenantId,
      toolId: tool?.id ?? null,
      providerId: provider.id,
      domain,
      sessionId,
      referrer,
    },
  });

  await recordToolEvent({
    tenantId,
    eventType: "affiliate_click",
    toolId: tool?.id,
    providerId: provider.id,
    domain,
    tld: parsed?.ok ? parsed.value.tld : null,
  });

  const target = appendDomainToTrackingUrl(destination, domain);
  if (!isSafeRedirectUrl(target)) {
    return NextResponse.redirect(new URL("/free-tools/domain-compare", req.url));
  }

  return NextResponse.redirect(target);
}
