import { prisma } from "@/lib/prisma";

export const TOOL_EVENTS = {
  tool_view: "tool_view",
  domain_search: "domain_search",
  domain_available: "domain_available",
  domain_unavailable: "domain_unavailable",
  comparison_view: "comparison_view",
  provider_error: "provider_error",
  buy_click: "buy_click",
  affiliate_click: "affiliate_click",
} as const;

export type ToolEventType = (typeof TOOL_EVENTS)[keyof typeof TOOL_EVENTS];

const ALLOWED_EVENTS = new Set<string>(Object.values(TOOL_EVENTS));

export async function recordToolEvent(input: {
  tenantId: string;
  eventType: string;
  toolId?: string | null;
  providerId?: string | null;
  domain?: string | null;
  tld?: string | null;
  metadata?: Record<string, unknown>;
}) {
  if (!ALLOWED_EVENTS.has(input.eventType)) return;
  try {
    await prisma.toolAnalyticsEvent.create({
      data: {
        tenantId: input.tenantId,
        eventType: input.eventType,
        toolId: input.toolId ?? null,
        providerId: input.providerId ?? null,
        domain: input.domain ? input.domain.slice(0, 255) : null,
        tld: input.tld ? input.tld.slice(0, 32) : null,
        metadata: input.metadata ? JSON.stringify(input.metadata) : null,
      },
    });
  } catch (error) {
    console.error("[tools-analytics] failed to record event", error);
  }
}
