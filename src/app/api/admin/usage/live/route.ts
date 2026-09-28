import { NextResponse } from "next/server";
import { requireTenantContext } from "@/lib/tenant-context";
import { assertPermission, PERMISSIONS } from "@/lib/permissions";
import { loadActiveUsers } from "@/lib/usage/query";
import { parseUsageFilters } from "@/lib/usage/series";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const ctx = await requireTenantContext();
    assertPermission(ctx.role, PERMISSIONS.TOOLS_VIEW, ctx.permissionOverrides);
    const url = new URL(req.url);
    const filters = parseUsageFilters({
      tool: url.searchParams.get("tool") || "",
      country: url.searchParams.get("country") || "",
      channel: url.searchParams.get("channel") || "",
    });
    const activeNow = await loadActiveUsers(ctx.tenantId, filters);
    return NextResponse.json({ activeNow });
  } catch {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
}
