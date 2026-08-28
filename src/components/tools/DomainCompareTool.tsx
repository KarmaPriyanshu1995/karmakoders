"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Check, Loader2, Search, Shield, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CompareRow {
  registrar: string;
  registrarSlug: string;
  available: boolean | null;
  registrationPrice: number | null;
  renewalPrice: number | null;
  transferPrice: number | null;
  privacyIncluded: boolean | null;
  currency: string;
  lastChecked: string;
  indicative: boolean;
  features: string[];
  status: string;
  message?: string;
  threeYearCost: number | null;
  fiveYearCost: number | null;
  overallScore: number | null;
  badges: string[];
  buyPath: string;
}

interface CompareResponse {
  domain: string;
  sld: string;
  tld: string;
  assumedTld?: boolean;
  available: boolean | null;
  alternatives: string[];
  rows: CompareRow[];
  lastChecked: string;
  disclosure: string;
  error?: string;
}

function money(value: number | null, currency = "USD") {
  if (value == null) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 2 }).format(value);
}

function relativeTime(iso: string) {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "recently";
  const diff = Math.max(0, Date.now() - then);
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes === 1) return "1 minute ago";
  if (minutes < 60) return `${minutes} minutes ago`;
  const hours = Math.round(minutes / 60);
  return hours === 1 ? "1 hour ago" : `${hours} hours ago`;
}

function fireGtag(event: string, params: Record<string, string>) {
  const gtag = (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag;
  if (typeof gtag === "function") gtag("event", event, params);
}

async function recordEvent(payload: Record<string, string>) {
  try {
    await fetch("/api/tools/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    // analytics must never break the tool
  }
}

const EXAMPLES = ["example.com", "mybusiness.ai", "startup.co"];

export function DomainCompareTool({
  initialDomain = "",
  disclosure,
}: {
  initialDomain?: string;
  disclosure: string;
}) {
  const [input, setInput] = useState(initialDomain);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CompareResponse | null>(null);

  const runCompare = async (domain: string) => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/domain/compare?domain=${encodeURIComponent(domain)}`);
      const data = (await res.json()) as CompareResponse;
      if (!res.ok) {
        setResult(null);
        setError(data.error || "Please enter a valid domain name.");
        return;
      }
      setResult(data);
      fireGtag("domain_search", { tool: "domain-compare", domain: data.domain, tld: data.tld });
      await recordEvent({
        eventType: "domain_search",
        toolSlug: "domain-compare",
        domain: data.domain,
        tld: data.tld,
      });
      if (data.available === true) {
        fireGtag("domain_available", { domain: data.domain });
        await recordEvent({ eventType: "domain_available", toolSlug: "domain-compare", domain: data.domain, tld: data.tld });
      } else if (data.available === false) {
        fireGtag("domain_unavailable", { domain: data.domain });
        await recordEvent({ eventType: "domain_unavailable", toolSlug: "domain-compare", domain: data.domain, tld: data.tld });
      }
      fireGtag("comparison_view", { domain: data.domain });
      await recordEvent({ eventType: "comparison_view", toolSlug: "domain-compare", domain: data.domain, tld: data.tld });
      for (const row of data.rows) {
        if (row.status !== "ok") {
          await recordEvent({
            eventType: "provider_error",
            toolSlug: "domain-compare",
            domain: data.domain,
            tld: data.tld,
            providerSlug: row.registrarSlug,
          });
        }
      }
    } catch {
      setResult(null);
      setError("We couldn't retrieve pricing right now. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void runCompare(input);
  };

  const okRows = result?.rows.filter((r) => r.status === "ok") ?? [];
  const failedRows = result?.rows.filter((r) => r.status !== "ok") ?? [];

  const bestFor = useMemo(() => {
    const map = new Map<string, string>();
    for (const row of okRows) {
      if (row.badges[0]) map.set(row.registrarSlug, row.badges[0]);
    }
    return map;
  }, [okRows]);

  return (
    <div>
      <form onSubmit={onSubmit} className="rounded-2xl border border-white/10 bg-white/5 p-4 md:p-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <label className="relative flex-1">
            <span className="sr-only">Domain name</span>
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Enter your domain name..."
              className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-slate-950/60 border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500/50"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
            />
          </label>
          <Button type="submit" disabled={loading} className="h-12 px-6 font-bold">
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Checking registrars...
              </>
            ) : (
              "Compare Prices"
            )}
          </Button>
        </div>
        <div className="mt-4 flex flex-wrap gap-2 text-sm text-slate-400">
          <span>Examples:</span>
          {EXAMPLES.map((example) => (
            <button
              key={example}
              type="button"
              className="underline decoration-white/20 hover:text-white"
              onClick={() => {
                setInput(example);
                void runCompare(example);
              }}
            >
              {example}
            </button>
          ))}
        </div>
      </form>

      {error && (
        <p className="mt-6 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-amber-200 text-sm">{error}</p>
      )}

      {result && (
        <div className="mt-10 space-y-8">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-widest text-slate-500 mb-1">Domain status</p>
              <h2 className="text-2xl font-bold text-white">{result.domain}</h2>
              {result.assumedTld && <p className="text-xs text-slate-500 mt-1">Interpreted as {result.domain}</p>}
            </div>
            <div>
              {result.available === true && (
                <span className="inline-flex items-center gap-2 text-emerald-400 font-semibold">
                  <Check className="w-5 h-5" /> Available
                </span>
              )}
              {result.available === false && (
                <span className="inline-flex items-center gap-2 text-rose-400 font-semibold">
                  <X className="w-5 h-5" /> Unavailable
                </span>
              )}
              {result.available == null && <span className="text-slate-400 font-semibold">Availability mixed or unknown</span>}
            </div>
          </div>

          {result.available === false && result.alternatives.length > 0 && (
            <div className="rounded-xl border border-white/10 p-5">
              <p className="text-white font-semibold mb-3">{result.domain} is already registered.</p>
              <p className="text-slate-400 text-sm mb-3">Try these alternatives:</p>
              <div className="flex flex-wrap gap-2">
                {result.alternatives.map((alt) => (
                  <button
                    key={alt}
                    type="button"
                    className="px-3 py-1.5 rounded-full border border-white/10 text-sm hover:border-indigo-500/40"
                    onClick={() => {
                      setInput(alt);
                      void runCompare(alt);
                    }}
                  >
                    {alt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {failedRows.length > 0 && (
            <div className="space-y-2">
              {failedRows.map((row) => (
                <p key={row.registrarSlug} className="text-sm text-amber-200/90">
                  {row.message || `${row.registrar} is temporarily unavailable.`} Other providers are still shown.
                </p>
              ))}
            </div>
          )}

          {okRows.length === 0 ? (
            <p className="text-slate-400">We couldn&apos;t retrieve pricing right now. Please try again.</p>
          ) : (
            <>
              <div className="hidden md:block overflow-x-auto rounded-2xl border border-white/10">
                <table className="w-full text-left text-sm">
                  <thead className="bg-white/5 text-slate-400">
                    <tr>
                      <th className="p-4 font-medium">Registrar</th>
                      <th className="p-4 font-medium">First year</th>
                      <th className="p-4 font-medium">Renewal</th>
                      <th className="p-4 font-medium">Transfer</th>
                      <th className="p-4 font-medium">Privacy</th>
                      <th className="p-4 font-medium">Best for</th>
                      <th className="p-4 font-medium text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {okRows.map((row) => (
                      <tr key={row.registrarSlug}>
                        <td className="p-4 font-semibold text-white">{row.registrar}</td>
                        <td className="p-4">
                          {money(row.registrationPrice, row.currency)}
                          {row.indicative && <span className="block text-[10px] text-slate-500">Indicative</span>}
                        </td>
                        <td className="p-4">{money(row.renewalPrice, row.currency)}</td>
                        <td className="p-4">{money(row.transferPrice, row.currency)}</td>
                        <td className="p-4">
                          {row.privacyIncluded === true ? "Included" : row.privacyIncluded === false ? "Not included" : "—"}
                        </td>
                        <td className="p-4 text-indigo-300">{bestFor.get(row.registrarSlug) || "—"}</td>
                        <td className="p-4 text-right">
                          <Link
                            href={`${row.buyPath}?domain=${encodeURIComponent(result.domain)}&tool=domain-compare`}
                            onClick={() => {
                              fireGtag("buy_click", { provider: row.registrarSlug, domain: result.domain });
                              void recordEvent({
                                eventType: "buy_click",
                                toolSlug: "domain-compare",
                                domain: result.domain,
                                tld: result.tld,
                                providerSlug: row.registrarSlug,
                              });
                            }}
                            className="inline-flex px-3 py-2 rounded-lg bg-indigo-500 text-slate-950 text-xs font-bold"
                          >
                            Buy Domain
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="md:hidden space-y-4">
                {okRows.map((row) => (
                  <article key={row.registrarSlug} className="rounded-2xl border border-white/10 bg-white/5 p-5">
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <h3 className="text-lg font-bold text-white">{row.registrar}</h3>
                      {bestFor.get(row.registrarSlug) && (
                        <span className="text-[10px] uppercase tracking-widest text-indigo-300">{bestFor.get(row.registrarSlug)}</span>
                      )}
                    </div>
                    <dl className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <dt className="text-slate-400">First year</dt>
                        <dd className="text-white">{money(row.registrationPrice, row.currency)}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-slate-400">Renewal</dt>
                        <dd className="text-white">{money(row.renewalPrice, row.currency)}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-slate-400">Transfer</dt>
                        <dd className="text-white">{money(row.transferPrice, row.currency)}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-slate-400">Privacy</dt>
                        <dd className="text-white">{row.privacyIncluded ? "Free" : "Not included"}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-slate-400">3-year cost</dt>
                        <dd className="text-white">{money(row.threeYearCost, row.currency)}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-slate-400">5-year cost</dt>
                        <dd className="text-white">{money(row.fiveYearCost, row.currency)}</dd>
                      </div>
                    </dl>
                    <Link
                      href={`${row.buyPath}?domain=${encodeURIComponent(result.domain)}&tool=domain-compare`}
                      onClick={() => {
                        fireGtag("buy_click", { provider: row.registrarSlug, domain: result.domain });
                        void recordEvent({
                          eventType: "buy_click",
                          toolSlug: "domain-compare",
                          domain: result.domain,
                          tld: result.tld,
                          providerSlug: row.registrarSlug,
                        });
                      }}
                      className="mt-5 flex items-center justify-center w-full py-3 rounded-xl bg-indigo-500 text-slate-950 font-bold"
                    >
                      Buy Domain
                    </Link>
                  </article>
                ))}
              </div>
            </>
          )}

          <div className="text-xs text-slate-500 space-y-2">
            <p>Prices checked recently. Final prices may vary at checkout.</p>
            <p>Last checked: {relativeTime(result.lastChecked)}</p>
            <p className="flex items-start gap-2">
              <Shield className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              {result.disclosure || disclosure}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
