import { ActiveNow } from "@/components/admin/usage/ActiveNow";
import { UsageBarChart, UsageLineChart } from "@/components/admin/usage/UsageCharts";
import type { UsageDashboard } from "@/lib/usage/query";
import type { UsageFilters } from "@/lib/usage/series";
import { filterQuery } from "@/lib/usage/series";

const CHANNEL_LABELS: Record<string, string> = {
  direct: "Direct",
  organic: "Google Organic",
  social: "Social Media",
  referral: "Backlinks",
};

function formatDuration(ms: number | null) {
  if (ms == null) return "—";
  if (ms < 1000) return `${Math.round(ms)} ms`;
  const seconds = ms / 1000;
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
}

function Card({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
      <p className="text-xs uppercase tracking-widest text-slate-500">{label}</p>
      <p className="text-3xl font-black text-white mt-2">{value}</p>
      {hint ? <p className="text-xs text-slate-500 mt-2">{hint}</p> : null}
    </div>
  );
}

function Breakdown({ title, rows }: { title: string; rows: { label: string; count: number }[] }) {
  return (
    <div className="rounded-xl border border-white/10 p-5">
      <h3 className="font-bold text-white mb-3">{title}</h3>
      {rows.length === 0 ? <p className="text-sm text-slate-500">No data yet.</p> : null}
      {rows.map((row) => (
        <p key={row.label} className="flex justify-between text-sm py-1">
          <span className="text-slate-300">{row.label}</span>
          <span className="text-slate-500">{row.count.toLocaleString()}</span>
        </p>
      ))}
    </div>
  );
}

export function UsageDashboardView({
  data,
  filters,
  tools,
}: {
  data: UsageDashboard;
  filters: UsageFilters;
  tools: { slug: string; name: string }[];
}) {
  const displayTo = new Date(filters.to);
  displayTo.setUTCDate(displayTo.getUTCDate() - 1);
  const fromValue = filters.from.toISOString().slice(0, 10);
  const toValue = displayTo.toISOString().slice(0, 10);
  const query = filterQuery(filters);
  const peak =
    data.peakHourUtc == null ? "—" : `${String(data.peakHourUtc).padStart(2, "0")}:00 UTC`;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-white">Usage analytics</h2>
        <p className="text-slate-400 mt-1 max-w-3xl">
          First-party counts for free tools. Visitor tokens are hashed before storage. IP addresses, raw user agents, and tool inputs are not saved.
        </p>
      </div>

      {!data.ready && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          Analytics storage is not ready yet. Apply the latest database migration, then refresh this page.
        </div>
      )}

      <form method="get" className="grid md:grid-cols-5 gap-3 rounded-xl border border-white/10 p-4">
        <label className="text-xs uppercase tracking-widest text-slate-500">
          From
          <input type="date" name="from" defaultValue={fromValue} className="mt-1 w-full rounded-lg bg-slate-900 border border-slate-800 px-3 py-2 text-sm text-white normal-case tracking-normal" />
        </label>
        <label className="text-xs uppercase tracking-widest text-slate-500">
          To
          <input type="date" name="to" defaultValue={toValue} className="mt-1 w-full rounded-lg bg-slate-900 border border-slate-800 px-3 py-2 text-sm text-white normal-case tracking-normal" />
        </label>
        <label className="text-xs uppercase tracking-widest text-slate-500">
          Tool
          <select name="tool" defaultValue={filters.tool} className="mt-1 w-full rounded-lg bg-slate-900 border border-slate-800 px-3 py-2 text-sm text-white normal-case tracking-normal">
            <option value="">All tools</option>
            {tools.map((tool) => (
              <option key={tool.slug} value={tool.slug}>
                {tool.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs uppercase tracking-widest text-slate-500">
          Region
          <input name="country" defaultValue={filters.country} placeholder="US" maxLength={2} className="mt-1 w-full rounded-lg bg-slate-900 border border-slate-800 px-3 py-2 text-sm text-white normal-case tracking-normal" />
        </label>
        <label className="text-xs uppercase tracking-widest text-slate-500">
          Channel
          <select name="channel" defaultValue={filters.channel} className="mt-1 w-full rounded-lg bg-slate-900 border border-slate-800 px-3 py-2 text-sm text-white normal-case tracking-normal">
            <option value="">All channels</option>
            <option value="direct">Direct</option>
            <option value="organic">Google Organic</option>
            <option value="social">Social Media</option>
            <option value="referral">Backlinks</option>
          </select>
        </label>
        <div className="md:col-span-5">
          <button type="submit" className="rounded-lg bg-[#FFC300] text-[#1C1B1A] font-bold px-4 py-2 text-sm">
            Apply filters
          </button>
        </div>
      </form>

      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
          <p className="text-xs uppercase tracking-widest text-slate-500">Active now</p>
          <ActiveNow key={query} initial={data.activeNow} query={query} />
          <p className="text-xs text-slate-500 mt-2">Distinct visitors in the last 5 minutes</p>
        </div>
        <Card label="Executions" value={data.executes.toLocaleString()} hint="Generate, calculate, convert, or submit" />
        <Card label="Completion rate" value={`${data.completionRate.toFixed(1)}%`} hint="Executions divided by page views" />
        <Card label="Peak hour" value={peak} hint="Busiest hour in the selected range" />
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <Card label="Daily active" value={data.dau.toLocaleString()} hint="Unique visitors today (UTC)" />
        <Card label="Weekly active" value={data.wau.toLocaleString()} hint="Unique visitors, last 7 days" />
        <Card label="Monthly active" value={data.mau.toLocaleString()} hint="Unique visitors, last 30 days" />
      </div>

      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card label="New visitors" value={data.newVisitors.toLocaleString()} hint="First visit in this range" />
        <Card label="Returning" value={data.returningVisitors.toLocaleString()} hint="Came back on a later day" />
        <Card label="Time to execute" value={formatDuration(data.avgDurationMs)} hint="Average from page land to success" />
        <Card label="Failure rate" value={`${data.errorRate.toFixed(1)}%`} hint={`${data.errors.toLocaleString()} failed executions`} />
      </div>

      <div className="grid lg:grid-cols-5 gap-4">
        <Card label="Page views" value={data.pageviews.toLocaleString()} />
        <Card label="Copy" value={data.copies.toLocaleString()} />
        <Card label="Downloads" value={data.downloads.toLocaleString()} />
        <Card label="Shares" value={data.shares.toLocaleString()} />
        <Card label="Errors" value={data.errors.toLocaleString()} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-white/10 p-5">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-bold text-white">Daily trend</h3>
            <p className="text-xs text-slate-500">
              <span className="text-slate-400">Views</span>
              <span className="mx-2 text-[#FFC300]">Executions</span>
            </p>
          </div>
          <UsageLineChart daily={data.daily} />
        </div>
        <div className="rounded-xl border border-white/10 p-5">
          <h3 className="font-bold text-white mb-4">Executions by tool</h3>
          <UsageBarChart rows={data.byTool} />
        </div>
      </div>

      <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
        <Breakdown title="Countries" rows={data.countries.map((row) => ({ label: row.code, count: row.count }))} />
        <Breakdown title="Cities" rows={data.cities.map((row) => ({ label: row.name, count: row.count }))} />
        <Breakdown title="Devices" rows={data.devices.map((row) => ({ label: row.name, count: row.count }))} />
        <Breakdown
          title="Acquisition"
          rows={data.channels.map((row) => ({ label: CHANNEL_LABELS[row.name] || row.name, count: row.count }))}
        />
      </div>

      <Breakdown title="Browsers" rows={data.browsers.map((row) => ({ label: row.name, count: row.count }))} />

      <div className="rounded-xl border border-white/10 p-5">
        <h3 className="font-bold text-white mb-3">Usage by hour (UTC)</h3>
        <div className="flex items-end gap-1 h-24">
          {data.hours.map((count, hour) => {
            const max = Math.max(1, ...data.hours);
            return (
              <div key={hour} className="flex-1 bg-[#FFC300]/80 rounded-sm" style={{ height: `${Math.max(4, (count / max) * 100)}%` }} title={`${hour}:00 · ${count}`} />
            );
          })}
        </div>
      </div>
    </div>
  );
}
