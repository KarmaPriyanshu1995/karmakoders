import { UsageDashboardView } from "@/components/admin/usage/UsageDashboard";
import { getToolsAdmin, getToolsAnalytics } from "@/lib/tool-actions";
import { requireTenantContext } from "@/lib/tenant-context";
import { loadUsageDashboard } from "@/lib/usage/query";
import { parseUsageFilters } from "@/lib/usage/series";

export const dynamic = "force-dynamic";

export default async function ToolsAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; tool?: string; country?: string; channel?: string }>;
}) {
  const query = await searchParams;
  const filters = parseUsageFilters(query);
  const { tenantId } = await requireTenantContext();
  const [usage, toolsResult, stats] = await Promise.all([
    loadUsageDashboard(tenantId, filters),
    getToolsAdmin(),
    getToolsAnalytics(),
  ]);

  const cards = [
    ["Views", stats.views],
    ["Searches", stats.searches],
    ["Available", stats.available],
    ["Unavailable", stats.unavailable],
    ["Buy clicks", stats.buyClicks],
    ["Affiliate CTR", `${stats.affiliateCtr.toFixed(1)}%`],
    ["Provider errors", stats.providerErrors],
    ["Comparison views", stats.comparisonViews],
  ];

  return (
    <div className="space-y-10">
      <UsageDashboardView
        data={usage}
        filters={filters}
        tools={toolsResult.tools.map((tool) => ({ slug: tool.slug, name: tool.name }))}
      />

      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-white">Domain Compare events</h2>
          <p className="text-slate-400 mt-1">Last 30 days. These counts stay separate from the privacy usage stream.</p>
        </div>
        <div className="rounded-xl border border-white/10 p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {cards.map(([label, value]) => (
              <div key={String(label)}>
                <p className="text-xs uppercase tracking-widest text-slate-500">{label}</p>
                <p className="text-2xl font-bold text-white mt-1">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
