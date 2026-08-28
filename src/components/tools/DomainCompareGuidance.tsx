"use client";

import type { CompareRow, CompareSummary } from "@/components/tools/domain-compare-types";

function labelForSlug(rows: CompareRow[], slug: string | null): string {
  if (!slug) return "—";
  return rows.find((r) => r.registrarSlug === slug)?.registrar ?? slug;
}

const PICKS: { key: keyof CompareSummary; title: string; hint: string }[] = [
  { key: "bestOverallId", title: "Best overall", hint: "Balanced score across price, renewal, privacy, and features" },
  { key: "cheapestFirstYearId", title: "Lowest first year", hint: "Best intro price — good for short experiments" },
  { key: "cheapestThreeYearId", title: "Best 3-year value", hint: "First year + 2 renewals — solid MVP timeline" },
  { key: "cheapestRenewalId", title: "Lowest renewal", hint: "Best if you plan to keep the brand 5+ years" },
];

export function DomainCompareGuidance() {
  return (
    <div className="mt-6 rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-5 text-sm text-slate-300 leading-relaxed">
      <p className="font-semibold text-white mb-2">Founder tip</p>
      <p>
        Compare <strong className="text-white">3-year cost</strong>, not just the first-year promo. Register the name before you announce publicly, and keep the domain in a company account — not a cofounder&apos;s personal email.
      </p>
    </div>
  );
}

export function CompareResultsSummary({ rows, summary }: { rows: CompareRow[]; summary: CompareSummary }) {
  const picks = PICKS.map((pick) => ({
    ...pick,
    slug: summary[pick.key],
    name: labelForSlug(rows, summary[pick.key]),
  })).filter((pick) => pick.slug);

  if (picks.length === 0) return null;

  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-5 md:p-6">
      <h3 className="text-lg font-bold text-white mb-1">Quick picks for founders</h3>
      <p className="text-sm text-slate-400 mb-4">Based on live prices for this domain. Badges in the table match these recommendations.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {picks.map((pick) => (
          <div key={pick.key} className="rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3">
            <p className="text-[10px] uppercase tracking-widest text-indigo-300 mb-1">{pick.title}</p>
            <p className="text-white font-semibold">{pick.name}</p>
            <p className="text-xs text-slate-500 mt-1">{pick.hint}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function CompareColumnLegend() {
  return (
    <details className="rounded-xl border border-white/10 bg-white/5 px-5 py-4 text-sm text-slate-400">
      <summary className="cursor-pointer font-semibold text-white">What do these columns mean?</summary>
      <dl className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <dt className="text-slate-300 font-medium">First year</dt>
          <dd>Promotional registration price — often advertised in ads.</dd>
        </div>
        <div>
          <dt className="text-slate-300 font-medium">Renewal</dt>
          <dd>Year-two price and beyond — the number that matters for long holds.</dd>
        </div>
        <div>
          <dt className="text-slate-300 font-medium">Transfer</dt>
          <dd>Cost to move the domain to another registrar later.</dd>
        </div>
        <div>
          <dt className="text-slate-300 font-medium">3-year / 5-year</dt>
          <dd>First year plus renewals — fairest comparison for startups.</dd>
        </div>
        <div>
          <dt className="text-slate-300 font-medium">Privacy</dt>
          <dd>WHOIS privacy hides your contact details from public lookup.</dd>
        </div>
        <div>
          <dt className="text-slate-300 font-medium">Indicative</dt>
          <dd>Catalog price — checkout may differ for premium names.</dd>
        </div>
      </dl>
    </details>
  );
}
