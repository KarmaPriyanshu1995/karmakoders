import { NextResponse } from "next/server";
import { prisma, withDbRetry } from "@/lib/prisma";
import { requireTenantContext, TenantAccessError } from "@/lib/tenant-context";
import { assertPermission, PERMISSIONS } from "@/lib/permissions";
import { parseSeoSettings, SEO_SETTINGS_KEY } from "@/lib/seo/seoSettings";
import { parseWeeklyReportSummary, renderWeeklyReportHtml } from "@/lib/seo/weeklyReportHtml";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { tenantId, role, permissionOverrides } = await requireTenantContext();
    assertPermission(role, PERMISSIONS.SEO_VIEW, permissionOverrides);
    const { id } = await params;

    const [report, settingsRecord] = await withDbRetry(() =>
      Promise.all([
        prisma.seoReport.findFirst({ where: { id, tenantId } }),
        prisma.siteConfig.findUnique({
          where: { tenantId_key: { tenantId, key: SEO_SETTINGS_KEY } },
        }),
      ])
    );

    if (!report) {
      return new NextResponse("Report not found", { status: 404 });
    }

    const settings = parseSeoSettings(settingsRecord?.value);
    const html = renderWeeklyReportHtml({
      title: report.title,
      brandName: settings.siteName || settings.defaultOrgName,
      summary: parseWeeklyReportSummary(report.summaryJson),
    });

    return new NextResponse(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    if (error instanceof TenantAccessError) {
      return new NextResponse("Forbidden", { status: 403 });
    }
    console.error("[SEO Report HTML GET]", error);
    return new NextResponse("Failed to render report", { status: 500 });
  }
}
