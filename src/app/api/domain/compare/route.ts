import { NextResponse } from "next/server";
import { parseDomainInput } from "@/lib/tools/domain";
import { compareDomain } from "@/lib/tools/compare-service";
import { getPrimaryTenantId } from "@/lib/tenant-context";
import { consumeRateLimit, clientKeyFromRequest } from "@/lib/tools/rate-limit";
import { ensureFreeToolsDefaults } from "@/lib/tools/defaults";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const parsed = parseDomainInput(searchParams.get("domain") || "");
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.message }, { status: 400 });
  }

  const limit = consumeRateLimit(clientKeyFromRequest(req));
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "We're checking again shortly." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } }
    );
  }

  try {
    const tenantId = await getPrimaryTenantId();
    await ensureFreeToolsDefaults(tenantId);
    const result = await compareDomain(tenantId, parsed.value);
    return NextResponse.json(result);
  } catch (error) {
    console.error("[domain-compare]", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({ error: "We couldn't retrieve pricing right now. Please try again." }, { status: 502 });
  }
}
