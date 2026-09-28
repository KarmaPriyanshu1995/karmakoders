import { NextResponse } from "next/server";
import { prisma, withDbRetry } from "@/lib/prisma";
import { requireTenantContext, TenantAccessError } from "@/lib/tenant-context";
import { assertPermission, PERMISSIONS } from "@/lib/permissions";
import { parseWeeklyReportSummary } from "@/lib/seo/weeklyReportHtml";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { tenantId, role, permissionOverrides } = await requireTenantContext();
    assertPermission(role, PERMISSIONS.SEO_VIEW, permissionOverrides);
    const { id } = await params;

    const report = await withDbRetry(() =>
      prisma.seoReport.findFirst({ where: { id, tenantId } })
    );
    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: report.id,
      type: report.type,
      title: report.title,
      createdAt: report.createdAt,
      summary: parseWeeklyReportSummary(report.summaryJson),
    });
  } catch (error) {
    if (error instanceof TenantAccessError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("[SEO Report GET]", error);
    return NextResponse.json({ error: "Failed to load report" }, { status: 500 });
  }
}
