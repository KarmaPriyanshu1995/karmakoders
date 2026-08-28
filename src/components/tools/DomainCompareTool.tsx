"use client";

import { useMemo, useState } from "react";
import { Check, Globe, Loader2, Search, Shield, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  ComparePriceChart,
  CompareWinnerStrip,
  RegistrarBuyPanel,
} from "@/components/tools/DomainCompareVisuals";
import type { CompareResponse } from "@/components/tools/domain-compare-types";

function relativeTime(iso: string) {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "recently";
  const diff = Math.max(0, Date.now() - then);
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  return `${hours}h ago`;
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
      await recordEvent({ eventType: "domain_search", toolSlug: "domain-compare", domain: data.domain, tld: data.tld });
      if (data.available === true) {
        await recordEvent({ eventType: "domain_available", toolSlug: "domain-compare", domain: data.domain, tld: data.tld });
      } else if (data.available === false) {
        await recordEvent({ eventType: "domain_unavailable", toolSlug: "domain-compare", domain: data.domain, tld: data.tld });
      }
      await recordEvent({ eventType: "comparison_view", toolSlug: "domain-compare", domain: data.domain, tld: data.tld });
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

  const okRows = useMemo(() => result?.rows.filter((r) => r.status === "ok") ?? [], [result]);
  const failedRows = useMemo(() => result?.rows.filter((r) => r.status !== "ok") ?? [], [result]);

  const handleBuyClick = (slug: string) => {
    if (!result) return;
    fireGtag("buy_click", { provider: slug, domain: result.domain });
    void recordEvent({
      eventType: "buy_click",
      toolSlug: "domain-compare",
      domain: result.domain,
      tld: result.tld,
      providerSlug: slug,
    });
  };

  return (
    <div className="space-y-8">
      {/* Search hero */}
      <div className="relative rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900/90 via-slate-950 to-indigo-950/40 p-6 md:p-8 overflow-hidden">
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative">
          <div className="flex items-center gap-2 text-indigo-300 text-xs font-bold uppercase tracking-widest mb-4">
            <Globe className="w-4 h-4" />
            GoDaddy vs Hostinger · Live API prices
          </div>

          <form onSubmit={onSubmit} className="flex flex-col sm:flex-row gap-3">
            <label className="relative flex-1">
              <span className="sr-only">Domain name</span>
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="yourstartup.com"
                className="w-full pl-12 pr-4 py-4 rounded-2xl bg-black/40 border border-white/10 text-white text-lg placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/50"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
              />
            </label>
            <Button
              type="submit"
              disabled={loading}
              className="h-14 px-8 rounded-2xl font-bold text-base bg-gradient-to-r from-amber-400 to-yellow-300 text-slate-950 hover:opacity-90 shadow-lg shadow-amber-500/20"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Checking…
                </>
              ) : (
                "Compare now"
              )}
            </Button>
          </form>

          <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
            <span className="text-slate-500">Try:</span>
            {EXAMPLES.map((example) => (
              <button
                key={example}
                type="button"
                className="px-3 py-1 rounded-full border border-white/10 text-slate-400 hover:text-white hover:border-indigo-500/40 transition-colors"
                onClick={() => {
                  setInput(example);
                  void runCompare(example);
                }}
              >
                {example}
              </button>
            ))}
          </div>
        </div>
      </div>

      {!result && !error && !loading && (
        <div className="grid sm:grid-cols-3 gap-4">
          {[
            { icon: Sparkles, title: "Live pricing", desc: "Real-time quotes from GoDaddy & Hostinger APIs" },
            { icon: Shield, title: "Renewal aware", desc: "See 3-year & 5-year cost — not just promo year one" },
            { icon: Globe, title: "Buy in one click", desc: "Go straight to registrar checkout when you decide" },
          ].map((item) => (
            <div key={item.title} className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
              <item.icon className="w-5 h-5 text-indigo-300 mb-3" />
              <p className="font-semibold text-white text-sm">{item.title}</p>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      )}

      {error && (
        <p className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-5 py-4 text-amber-200 text-sm">{error}</p>
      )}

      {result && (
        <div className="space-y-8">
          {/* Status banner */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 mb-2">Results for</p>
              <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight">{result.domain}</h2>
              <p className="text-xs text-slate-500 mt-2">Updated {relativeTime(result.lastChecked)} · 2 registrars compared</p>
            </div>
            <div
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold ${
                result.available === true
                  ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                  : result.available === false
                    ? "bg-rose-500/15 text-rose-300 border border-rose-500/30"
                    : "bg-slate-500/15 text-slate-300 border border-slate-500/30"
              }`}
            >
              {result.available === true && (
                <>
                  <Check className="w-4 h-4" /> Available to register
                </>
              )}
              {result.available === false && (
                <>
                  <X className="w-4 h-4" /> Already registered
                </>
              )}
              {result.available == null && "Availability varies"}
            </div>
          </div>

          {result.available === false && result.alternatives.length > 0 && (
            <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] p-5">
              <p className="text-white font-medium mb-3">That name is taken — try these alternatives:</p>
              <div className="flex flex-wrap gap-2">
                {result.alternatives.map((alt) => (
                  <button
                    key={alt}
                    type="button"
                    className="px-4 py-2 rounded-xl border border-white/10 text-sm text-slate-300 hover:text-white hover:border-indigo-500/50 transition-colors"
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
                  {row.registrar} is temporarily unavailable — retry in a moment.
                </p>
              ))}
            </div>
          )}

          {okRows.length === 0 ? (
            <p className="text-slate-400 text-center py-12">Couldn&apos;t fetch live prices. Please try again.</p>
          ) : (
            <>
              {result.summary && <CompareWinnerStrip rows={okRows} summary={result.summary} />}
              <ComparePriceChart rows={okRows} />
              <RegistrarBuyPanel rows={okRows} domain={result.domain} onBuyClick={handleBuyClick} />
            </>
          )}

          <p className="flex items-start gap-2 text-xs text-slate-500">
            <Shield className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            {result.disclosure || disclosure}
          </p>
        </div>
      )}
    </div>
  );
}
