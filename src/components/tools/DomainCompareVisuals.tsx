"use client";

import Link from "next/link";
import { ArrowUpRight, Check, Shield, Sparkles, TrendingDown, X, Zap } from "lucide-react";
import type { CompareRow, CompareSummary } from "@/components/tools/domain-compare-types";

const REGISTRAR_THEME: Record<string, { accent: string; glow: string; bar: string }> = {
  godaddy: {
    accent: "from-teal-500/20 to-emerald-500/5",
    glow: "shadow-teal-500/10",
    bar: "bg-gradient-to-r from-teal-400 to-emerald-500",
  },
  hostinger: {
    accent: "from-violet-500/20 to-indigo-500/5",
    glow: "shadow-violet-500/20",
    bar: "bg-gradient-to-r from-violet-400 to-indigo-500",
  },
};

function money(value: number | null, currency = "USD") {
  if (value == null) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 2 }).format(value);
}

function MetricBar({
  label,
  value,
  max,
  currency,
  barClass,
}: {
  label: string;
  value: number | null;
  max: number;
  currency: string;
  barClass: string;
}) {
  const pct = value != null && max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-400">{label}</span>
        <span className="text-white font-semibold tabular-nums">{money(value, currency)}</span>
      </div>
      <div className="h-2.5 rounded-full bg-white/5 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${barClass}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function ScoreRing({ score }: { score: number | null }) {
  const value = score ?? 0;
  const circumference = 2 * Math.PI * 36;
  const offset = circumference - (value / 100) * circumference;
  return (
    <div className="relative w-20 h-20 shrink-0">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80">
        <circle cx="40" cy="40" r="36" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
        <circle
          cx="40"
          cy="40"
          r="36"
          fill="none"
          stroke="url(#scoreGradient)"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-700"
        />
        <defs>
          <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#818cf8" />
            <stop offset="100%" stopColor="#facc15" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-black text-white leading-none">{value ? Math.round(value) : "—"}</span>
        <span className="text-[9px] uppercase tracking-wider text-slate-500">score</span>
      </div>
    </div>
  );
}

export function ComparePriceChart({ rows }: { rows: CompareRow[] }) {
  if (rows.length === 0) return null;

  return (
    <section className="rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900/80 to-slate-950 p-6 md:p-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-indigo-300 mb-2">Price breakdown</p>
          <h3 className="text-xl md:text-2xl font-bold text-white">Side-by-side cost comparison</h3>
          <p className="text-sm text-slate-400 mt-1">Each registrar shows prices in its native catalog currency.</p>
        </div>
        <div className="flex items-center gap-4 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-gradient-to-r from-teal-400 to-emerald-500" /> GoDaddy
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-gradient-to-r from-violet-400 to-indigo-500" /> Hostinger
          </span>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {rows.map((row) => {
          const theme = REGISTRAR_THEME[row.registrarSlug] ?? REGISTRAR_THEME.godaddy;
          const max = Math.max(
            row.registrationPrice ?? 0,
            row.renewalPrice ?? 0,
            row.threeYearCost ?? 0,
            row.fiveYearCost ?? 0,
            1
          );
          return (
            <div
              key={row.registrarSlug}
              className={`rounded-2xl border border-white/10 bg-gradient-to-br ${theme.accent} p-5 shadow-xl ${theme.glow}`}
            >
              <div className="flex items-start justify-between gap-3 mb-6">
                <div>
                  <h4 className="text-lg font-bold text-white">{row.registrar}</h4>
                  {row.features.length > 0 && (
                    <p className="text-[11px] text-slate-400 mt-1">{row.features.slice(0, 2).join(" · ")}</p>
                  )}
                </div>
                <ScoreRing score={row.overallScore} />
              </div>
              <div className="space-y-4">
                <MetricBar
                  label="First year"
                  value={row.registrationPrice}
                  max={max}
                  currency={row.currency}
                  barClass={theme.bar}
                />
                <MetricBar label="Renewal" value={row.renewalPrice} max={max} currency={row.currency} barClass={theme.bar} />
                <MetricBar label="3-year total" value={row.threeYearCost} max={max} currency={row.currency} barClass={theme.bar} />
                <MetricBar label="5-year total" value={row.fiveYearCost} max={max} currency={row.currency} barClass={theme.bar} />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

const PICK_META: { key: keyof CompareSummary; title: string; icon: typeof Sparkles }[] = [
  { key: "bestOverallId", title: "Best overall", icon: Sparkles },
  { key: "cheapestFirstYearId", title: "Lowest first year", icon: Zap },
  { key: "cheapestThreeYearId", title: "Best 3-year value", icon: TrendingDown },
  { key: "cheapestRenewalId", title: "Lowest renewal", icon: Shield },
];

export function CompareWinnerStrip({ rows, summary }: { rows: CompareRow[]; summary: CompareSummary }) {
  const picks = PICK_META.map((pick) => ({
    ...pick,
    slug: summary[pick.key],
    name: rows.find((r) => r.registrarSlug === summary[pick.key])?.registrar,
  })).filter((p) => p.slug && p.name);

  if (picks.length === 0) return null;

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {picks.map((pick) => {
        const Icon = pick.icon;
        return (
          <div
            key={pick.key}
            className="group rounded-xl border border-white/10 bg-white/[0.03] hover:border-indigo-500/30 hover:bg-indigo-500/5 px-4 py-4 transition-colors"
          >
            <div className="flex items-center gap-2 mb-2">
              <Icon className="w-4 h-4 text-indigo-300" />
              <p className="text-[10px] uppercase tracking-widest text-indigo-300">{pick.title}</p>
            </div>
            <p className="text-white font-bold text-lg">{pick.name}</p>
          </div>
        );
      })}
    </div>
  );
}

export function RegistrarBuyPanel({
  rows,
  domain,
  onBuyClick,
}: {
  rows: CompareRow[];
  domain: string;
  onBuyClick: (slug: string) => void;
}) {
  const hostinger = rows.find((r) => r.registrarSlug === "hostinger");
  const godaddy = rows.find((r) => r.registrarSlug === "godaddy");

  const panels = [
    godaddy && {
      row: godaddy,
      highlight: false,
      cta: "Search on GoDaddy",
      note: "Live prices from GoDaddy API · Opens godaddy.com",
    },
    hostinger && {
      row: hostinger,
      highlight: true,
      cta: "Get domain on Hostinger",
      note: "Partner link · Free WHOIS privacy on many TLDs",
    },
  ].filter(Boolean) as Array<{
    row: CompareRow;
    highlight: boolean;
    cta: string;
    note: string;
  }>;

  return (
    <section className="rounded-2xl border border-white/10 overflow-hidden">
      <div className="px-6 py-5 border-b border-white/10 bg-gradient-to-r from-indigo-500/10 via-transparent to-amber-500/10">
        <h3 className="text-lg font-bold text-white">Ready to register {domain}?</h3>
        <p className="text-sm text-slate-400 mt-1">Jump straight to checkout — compare above, then buy where it fits your budget.</p>
      </div>
      <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-white/10">
        {panels.map(({ row, highlight, cta, note }) => (
          <div key={row.registrarSlug} className={`p-6 md:p-8 ${highlight ? "bg-violet-500/[0.06]" : "bg-slate-950/40"}`}>
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                {highlight && (
                  <span className="inline-block text-[10px] uppercase tracking-widest text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full mb-2">
                    Recommended partner
                  </span>
                )}
                <h4 className="text-xl font-bold text-white">{row.registrar}</h4>
                <p className="text-sm text-slate-400 mt-1">{note}</p>
              </div>
              {row.available === true && (
                <span className="inline-flex items-center gap-1 text-xs text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-full">
                  <Check className="w-3 h-3" /> Available
                </span>
              )}
              {row.available === false && (
                <span className="inline-flex items-center gap-1 text-xs text-rose-400 bg-rose-500/10 px-2 py-1 rounded-full">
                  <X className="w-3 h-3" /> Taken
                </span>
              )}
            </div>

            <dl className="grid grid-cols-2 gap-3 mb-6 text-sm">
              <div className="rounded-lg bg-white/5 px-3 py-2">
                <dt className="text-slate-500 text-xs">First year</dt>
                <dd className="text-white font-bold">{money(row.registrationPrice, row.currency)}</dd>
              </div>
              <div className="rounded-lg bg-white/5 px-3 py-2">
                <dt className="text-slate-500 text-xs">Renewal</dt>
                <dd className="text-white font-bold">{money(row.renewalPrice, row.currency)}</dd>
              </div>
              <div className="rounded-lg bg-white/5 px-3 py-2">
                <dt className="text-slate-500 text-xs">3-year</dt>
                <dd className="text-white font-bold">{money(row.threeYearCost, row.currency)}</dd>
              </div>
              <div className="rounded-lg bg-white/5 px-3 py-2">
                <dt className="text-slate-500 text-xs">Privacy</dt>
                <dd className="text-white font-bold">{row.privacyIncluded ? "Included" : "Extra"}</dd>
              </div>
            </dl>

            <Link
              href={`${row.buyPath}?domain=${encodeURIComponent(domain)}&tool=domain-compare`}
              onClick={() => onBuyClick(row.registrarSlug)}
              className={`inline-flex items-center justify-center gap-2 w-full py-3.5 rounded-xl font-bold text-sm transition-transform hover:scale-[1.01] ${
                highlight
                  ? "bg-gradient-to-r from-amber-400 to-yellow-300 text-slate-950 shadow-lg shadow-amber-500/20"
                  : "bg-white/10 text-white border border-white/15 hover:bg-white/15"
              }`}
            >
              {cta}
              <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}
