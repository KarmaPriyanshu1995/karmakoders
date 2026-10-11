"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  IconDashboard,
  IconGlobe,
  IconRadar,
  IconRepo,
  IconScan,
  IconShield,
  IconSpinner,
  IconMenu,
  IconX,
} from "@/components/scanner/icons";
import { MetricCard, SeverityBadge, GradeCard, EmptyState } from "@/components/scanner/ui";
import type { DashboardData, Severity } from "@/lib/scanner/dashboard";
import { SEVERITIES } from "@/lib/scanner/dashboard";

const SEVERITY_BAR: Record<Severity, string> = {
  critical: "bg-rose-500",
  high: "bg-orange-500",
  medium: "bg-yellow-500",
  low: "bg-sky-500",
  info: "bg-slate-500",
};

type NavItem = { label: string; href?: string; icon: React.ReactNode; active?: boolean; soon?: boolean };

function Sidebar({ projectId, open, onClose }: { projectId: string; open: boolean; onClose: () => void }) {
  const base = `/security-scanner/dashboard/${projectId}`;
  const sections: { title: string; items: NavItem[] }[] = [
    {
      title: "General",
      items: [
        { label: "Dashboard", href: base, icon: <IconDashboard className="h-4 w-4" />, active: true },
        { label: "Issues", href: `${base}#issues`, icon: <IconShield className="h-4 w-4" /> },
        { label: "Scans", href: `${base}#scans`, icon: <IconScan className="h-4 w-4" /> },
      ],
    },
    {
      title: "Security",
      items: [
        { label: "Website Security", href: `${base}#severity`, icon: <IconGlobe className="h-4 w-4" /> },
        { label: "Attack Surface", href: `${base}#categories`, icon: <IconRadar className="h-4 w-4" /> },
        { label: "API Security", href: `${base}#api-security`, icon: <IconShield className="h-4 w-4" /> },
        { label: "Source/GitHub", href: `${base}#scans`, icon: <IconRepo className="h-4 w-4" /> },
      ],
    },
    {
      title: "Configuration",
      items: [{ label: "New scan", href: "/security-scanner", icon: <IconScan className="h-4 w-4" /> }],
    },
  ];
  return (
    <>
      {open ? <button className="fixed inset-0 z-30 bg-black/50 lg:hidden" aria-label="Close menu" onClick={onClose} /> : null}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 overflow-y-auto border-r border-white/10 bg-scanner-bg px-3 py-4 transition-transform lg:static lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-2">
          <span className="text-sm font-black tracking-tight text-white">KARMAKODERS</span>
          <button className="scanner-btn-ghost px-2 lg:hidden" aria-label="Close menu" onClick={onClose}>
            <IconX className="h-5 w-5" />
          </button>
        </div>
        <p className="mt-0.5 px-2 text-[11px] font-semibold uppercase tracking-wide text-scanner-brand-label">
          Security Scanner
        </p>
        <nav className="mt-5 space-y-5">
          {sections.map((section) => (
            <div key={section.title}>
              <p className="px-2 text-[10px] font-bold uppercase tracking-widest text-slate-600">{section.title}</p>
              <ul className="mt-2 space-y-0.5">
                {section.items.map((item) => (
                  <li key={item.label}>
                    <Link
                      href={item.href ?? "#"}
                      aria-current={item.active ? "page" : undefined}
                      className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors ${
                        item.active
                          ? "bg-scanner-brand-soft font-semibold text-scanner-brand-label"
                          : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
                      }`}
                    >
                      <span className="text-slate-500">{item.icon}</span>
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
}

function SeverityChart({ bySeverity, title }: { bySeverity: Record<Severity, number>; title: string }) {
  const max = Math.max(1, ...SEVERITIES.map((s) => bySeverity[s]));
  const total = SEVERITIES.reduce((n, s) => n + bySeverity[s], 0);
  return (
    <section id="severity" className="scanner-card-pad">
      <h2 className="scanner-label">{title}</h2>
      {total === 0 ? (
        <p className="mt-4 text-sm text-slate-500">No findings in the latest completed scan.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {SEVERITIES.map((sev) => (
            <li key={sev} className="flex items-center gap-3">
              <span className="w-20 shrink-0">
                <SeverityBadge severity={sev} />
              </span>
              <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-white/5" role="img"
                   aria-label={`${sev}: ${bySeverity[sev]}`}>
                <div className={`h-full rounded-full ${SEVERITY_BAR[sev]}`}
                     style={{ width: `${(bySeverity[sev] / max) * 100}%` }} />
              </div>
              <span className="w-8 text-right text-sm tabular-nums text-slate-300">{bySeverity[sev]}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function CategoryChart({ data }: { data: { category: string; count: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <section id="categories" className="scanner-card-pad">
      <h2 className="scanner-label">Findings by category</h2>
      {data.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">No categorized findings yet.</p>
      ) : (
        <ul className="mt-4 space-y-2.5">
          {data.slice(0, 8).map((d) => (
            <li key={d.category} className="flex items-center gap-3">
              <span className="w-32 shrink-0 truncate text-sm text-slate-300" title={d.category}>{d.category}</span>
              <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-white/5">
                <div className="h-full rounded-full bg-scanner-brand" style={{ width: `${(d.count / max) * 100}%` }} />
              </div>
              <span className="w-8 text-right text-sm tabular-nums text-slate-300">{d.count}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function ApiSecurityPanel({ api }: { api: DashboardData["apiSecurity"] }) {
  return (
    <section id="api-security" className="scanner-card-pad">
      <div className="flex items-center justify-between">
        <h2 className="scanner-label">API Security</h2>
        <span className="text-[11px] uppercase tracking-wide text-slate-500">
          {api.ran ? "Last scan included API analysis" : "Not run in the latest scan"}
        </span>
      </div>
      {!api.ran ? (
        <p className="mt-4 text-sm text-slate-500">
          Enable API Security to see inventory, passive findings and authorized authentication / authorization
          testing here. Passive specification analysis and active behavioural testing are reported separately.
        </p>
      ) : (
        <>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <MetricCard label="API endpoints" value={api.endpoints} />
            <MetricCard label="API findings" value={api.findingCount} />
            <MetricCard label="Confirmed (active)" value={api.confirmed} hint={`${api.activeRequests} authorized req`} />
            <MetricCard label="Verified" value={api.verified} />
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Confirmed findings come from active behavioural tests against authorized test objects; passive findings
            are specification/inventory concerns. Unavailable checks are reported as not tested, never as passing.
          </p>
        </>
      )}
    </section>
  );
}

function RecentScans({ scans }: { scans: DashboardData["recentScans"] }) {
  return (
    <section id="scans" className="scanner-card overflow-hidden">
      <h2 className="scanner-label px-5 pt-5 md:px-6">Recent scans</h2>
      {scans.length === 0 ? (
        <p className="px-5 py-6 text-sm text-slate-500 md:px-6">No scans yet.</p>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-y border-white/10 text-[11px] uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-2 font-semibold md:px-6">Type</th>
                <th className="px-3 py-2 font-semibold">Status</th>
                <th className="px-3 py-2 font-semibold">Grade</th>
                <th className="px-3 py-2 font-semibold">Finished</th>
                <th className="px-5 py-2 font-semibold md:px-6">Report</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {scans.map((s) => (
                <tr key={s.id} className="hover:bg-white/5">
                  <td className="px-5 py-2.5 text-slate-300 md:px-6">{s.type ?? "url"}</td>
                  <td className="px-3 py-2.5 text-slate-400">{s.status ?? "—"}</td>
                  <td className="px-3 py-2.5 font-semibold text-white">{s.grade ?? "—"}</td>
                  <td className="px-3 py-2.5 text-slate-500">
                    {s.finishedAt ? new Date(s.finishedAt).toLocaleString() : "—"}
                  </td>
                  <td className="px-5 py-2.5 md:px-6">
                    <Link className="text-scanner-brand-label hover:underline" href={`/security-scanner/scans/${s.id}`}>
                      Open
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export function DashboardClient({ projectId }: { projectId: string }) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [menu, setMenu] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/dashboard`, { cache: "no-store" });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error || "Could not load dashboard.");
      setData(body as DashboardData);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load dashboard.");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="flex min-h-screen text-slate-100">
      <Sidebar projectId={projectId} open={menu} onClose={() => setMenu(false)} />
      <div className="flex-1">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-white/10 bg-scanner-bg/90 px-4 py-3 backdrop-blur-xl md:px-6">
          <div className="flex items-center gap-2">
            <button className="scanner-btn-ghost -ml-2 px-2 lg:hidden" aria-label="Open menu" onClick={() => setMenu(true)}>
              <IconMenu className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-base font-semibold text-white">Security dashboard</h1>
              <p className="text-xs text-slate-500">{data?.project.name ?? "Loading project…"}</p>
            </div>
          </div>
          <button className="scanner-btn-ghost text-sm" onClick={() => void load()} disabled={loading}>
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </header>

        <main id="main" className="mx-auto max-w-6xl space-y-5 px-4 py-6 md:px-6">
          {loading && !data ? (
            <div className="scanner-card-pad flex items-center gap-3 text-slate-400">
              <IconSpinner className="h-5 w-5 animate-spin" /> Loading dashboard…
            </div>
          ) : error ? (
            <EmptyState
              title="Could not load the dashboard"
              body={error}
              action={<button className="scanner-btn-ghost" onClick={() => void load()}>Try again</button>}
            />
          ) : data ? (
            data.metrics.totalScans === 0 ? (
              <EmptyState
                title="No scans yet"
                body="Run your first scan to populate the dashboard with real findings and a security grade."
                action={<Link className="scanner-btn-ghost" href="/security-scanner">Start a scan</Link>}
              />
            ) : (
              <>
                <section id="issues" className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
                  <MetricCard label="Total scans" value={data.metrics.totalScans} />
                  <MetricCard label="Critical" value={data.metrics.criticalOpen} />
                  <MetricCard label="High" value={data.metrics.highOpen} />
                  <MetricCard label="Open issues" value={data.metrics.potentialOpen} />
                  <MetricCard label="Resolved" value={data.metrics.resolved} />
                  <MetricCard label="Last scan" value={data.metrics.lastScanStatus ?? "—"} />
                </section>

                <div className="grid gap-5 lg:grid-cols-3">
                  <div className="lg:col-span-1">
                    {data.grade ? (
                      <GradeCard grade={data.grade} />
                    ) : (
                      <div className="scanner-card-pad">
                        <p className="scanner-label">Security grade</p>
                        <p className="mt-3 text-sm text-slate-500">No completed scan yet.</p>
                      </div>
                    )}
                  </div>
                  <div className="lg:col-span-2">
                    <SeverityChart bySeverity={data.findingsBySeverity} title="Findings by severity" />
                  </div>
                </div>

                <div className="grid gap-5 lg:grid-cols-2">
                  <CategoryChart data={data.findingsByCategory} />
                  <ApiSecurityPanel api={data.apiSecurity} />
                </div>

                <RecentScans scans={data.recentScans} />
              </>
            )
          ) : null}
        </main>
      </div>
    </div>
  );
}
