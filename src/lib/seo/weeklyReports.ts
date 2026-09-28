import { prisma, withDbRetry } from "@/lib/prisma";
import { runWeeklyHealthReport } from "@/lib/seo/automationEngine";
import { isWeeklyReportsEnabled, parseSeoSettings, SEO_SETTINGS_KEY } from "@/lib/seo/seoSettings";

export interface WeeklyReportRunResult {
  tenantId: string;
  tenantName: string;
  status: "ran" | "skipped" | "failed";
  reportId?: string;
  error?: string;
}

export async function runWeeklyReportsForActiveTenants(): Promise<WeeklyReportRunResult[]> {
  const tenants = await withDbRetry(() =>
    prisma.tenant.findMany({
      where: { status: "ACTIVE" },
      select: {
        id: true,
        name: true,
        siteConfigs: {
          where: { key: SEO_SETTINGS_KEY },
          select: { value: true },
        },
      },
    })
  );

  const results: WeeklyReportRunResult[] = [];

  for (const tenant of tenants) {
    const settings = parseSeoSettings(tenant.siteConfigs[0]?.value);
    if (!isWeeklyReportsEnabled(settings)) {
      results.push({ tenantId: tenant.id, tenantName: tenant.name, status: "skipped" });
      continue;
    }

    try {
      const report = await runWeeklyHealthReport(tenant.id);
      results.push({
        tenantId: tenant.id,
        tenantName: tenant.name,
        status: "ran",
        reportId: report.reportId,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Weekly report failed";
      console.error(`[SEO weekly report] ${tenant.id}`, error);
      results.push({ tenantId: tenant.id, tenantName: tenant.name, status: "failed", error: message });
    }
  }

  return results;
}
