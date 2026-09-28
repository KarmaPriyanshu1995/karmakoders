import { NextResponse } from "next/server";
import { prisma, withDbRetry } from "@/lib/prisma";
import { requireTenantContext, TenantAccessError } from "@/lib/tenant-context";
import { assertPermission, PERMISSIONS } from "@/lib/permissions";
import { runWeeklyHealthReport } from "@/lib/seo/automationEngine";
import { parseWeeklyReportSummary } from "@/lib/seo/weeklyReportHtml";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { tenantId, role, permissionOverrides } = await requireTenantContext();
    assertPermission(role, PERMISSIONS.SEO_VIEW, permissionOverrides);

    const reports = await withDbRetry(() =>
      prisma.seoReport.findMany({
        where: { tenantId },
        orderBy: { createdAt: "desc" },
        take: 50,
      })
    );

    return NextResponse.json({
      reports: reports.map((report) => {
        const summary = parseWeeklyReportSummary(report.summaryJson);
        return {
          id: report.id,
          type: report.type,
          title: report.title,
          createdAt: report.createdAt,
          overallScore: summary.scores.overall,
          issuesCount: summary.audit.issuesCount,
        };
      }),
    });
  } catch (error) {
    if (error instanceof TenantAccessError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("[SEO Reports GET]", error);
    return NextResponse.json({ error: "Failed to load reports" }, { status: 500 });
  }
}

export async function POST() {
  try {
    const { tenantId, role, permissionOverrides } = await requireTenantContext();
    assertPermission(role, PERMISSIONS.SEO_UPDATE, permissionOverrides);

    const result = await runWeeklyHealthReport(tenantId);
    return NextResponse.json({ success: true, reportId: result.reportId, logs: result.logs });
  } catch (error) {
    if (error instanceof TenantAccessError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("[SEO Reports POST]", error);
    return NextResponse.json({ error: "Failed to generate report" }, { status: 500 });
  }
}
