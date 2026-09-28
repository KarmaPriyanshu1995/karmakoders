import { prisma } from "@/lib/prisma";
import { getPrimaryTenantId } from "@/lib/tenant-context";
import { analyticsSalt, classifyChannel, geoFromHeaders, hashVisitor, sanitizeUsagePayload } from "@/lib/usage/privacy";

const toolCache = new Map<string, { id: string | null; exp: number }>();

async function resolveToolId(tenantId: string, slug: string): Promise<string | null> {
  const key = `${tenantId}:${slug}`;
  const hit = toolCache.get(key);
  if (hit && hit.exp > Date.now()) return hit.id;
  const tool = await prisma.freeTool.findFirst({ where: { tenantId, slug }, select: { id: true } });
  const id = tool?.id ?? null;
  toolCache.set(key, { id, exp: Date.now() + 5 * 60 * 1000 });
  return id;
}

export async function recordUsageFromRequest(req: Request): Promise<{ status: number }> {
  const text = await req.text();
  if (text.length > 2048) return { status: 413 };
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { status: 400 };
  }
  const parsed = sanitizeUsagePayload(raw);
  if (!parsed) return { status: 400 };

  const tenantId = await getPrimaryTenantId();
  const toolId = await resolveToolId(tenantId, parsed.tool);
  if (!toolId) return { status: 204 };

  const geo = geoFromHeaders(req.headers);
  let siteHost = "www.karmakoders.com";
  try {
    siteHost = new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://www.karmakoders.com").hostname;
  } catch {
    siteHost = "www.karmakoders.com";
  }
  const source = classifyChannel(parsed.referrer, siteHost);

  await prisma.usageEvent.create({
    data: {
      tenantId,
      toolId,
      toolSlug: parsed.tool,
      eventType: parsed.event,
      visitorKey: hashVisitor(parsed.visitorToken, analyticsSalt()),
      returning: parsed.returning,
      country: geo.country,
      city: geo.city,
      device: parsed.device,
      browser: parsed.browser,
      channel: source.channel,
      referrerHost: source.host,
      durationMs: parsed.durationMs,
    },
  });

  return { status: 204 };
}
