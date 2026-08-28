import { getToolsAnalytics } from "@/lib/tool-actions";

export const dynamic = "force-dynamic";

export default async function ToolsAnalyticsPage() {
  const stats = await getToolsAnalytics();
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
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-white">Tool analytics</h2>
        <p className="text-slate-400 mt-1">Last 30 days. No personal identifiers are stored with these events.</p>
      </div>
      <div className="rounded-xl border border-white/10 p-6">
        <h3 className="text-lg font-bold text-white mb-4">Domain Compare</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {cards.map(([label, value]) => (
            <div key={String(label)}>
              <p className="text-xs uppercase tracking-widest text-slate-500">{label}</p>
              <p className="text-2xl font-bold text-white mt-1">{value}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="grid md:grid-cols-2 gap-6">
        <div className="rounded-xl border border-white/10 p-5">
          <h3 className="font-bold text-white mb-3">Top TLDs</h3>
          {stats.topTlds.length === 0 && <p className="text-slate-500 text-sm">No search data yet.</p>}
          {stats.topTlds.map((item) => (
            <p key={item.tld} className="flex justify-between text-sm py-1">
              <span className="text-slate-300">.{item.tld}</span>
              <span className="text-slate-500">{item.count}</span>
            </p>
          ))}
        </div>
        <div className="rounded-xl border border-white/10 p-5">
          <h3 className="font-bold text-white mb-3">Top providers</h3>
          {stats.topProviders.length === 0 && <p className="text-slate-500 text-sm">No affiliate clicks yet.</p>}
          {stats.topProviders.map((item) => (
            <p key={item.id} className="flex justify-between text-sm py-1">
              <span className="text-slate-300">{item.name}</span>
              <span className="text-slate-500">{item.count}</span>
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}
