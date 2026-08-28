"use client";

import Link from "next/link";
import { ArrowUpRight, Store } from "lucide-react";
import type { AffiliateBuyOption } from "@/components/tools/domain-compare-types";

const OPTION_THEME: Record<string, string> = {
  namecheap: "from-orange-500/15 to-red-500/5 border-orange-500/20",
  porkbun: "from-pink-500/15 to-rose-500/5 border-pink-500/20",
  dynadot: "from-blue-500/15 to-cyan-500/5 border-blue-500/20",
};

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

export function AffiliateRegistrarCards({
  options,
  domain,
}: {
  options: AffiliateBuyOption[];
  domain: string;
}) {
  if (options.length === 0) return null;

  return (
    <section className="rounded-2xl border border-white/10 overflow-hidden">
      <div className="px-6 py-5 border-b border-white/10 bg-gradient-to-r from-slate-800/40 to-transparent">
        <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-widest mb-2">
          <Store className="w-4 h-4" />
          More places to buy
        </div>
        <h3 className="text-lg font-bold text-white">Check other registrars</h3>
        <p className="text-sm text-slate-400 mt-1 max-w-2xl">
          Live prices above are from GoDaddy & Hostinger only. These registrars aren&apos;t in our API compare — but you
          can search and buy {domain} directly on their sites.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 p-6 bg-slate-950/30">
        {options.map((option) => (
          <article
            key={option.slug}
            className={`rounded-xl border bg-gradient-to-br p-5 flex flex-col justify-between gap-5 min-h-[140px] ${
              OPTION_THEME[option.slug] ?? "from-white/5 to-transparent border-white/10"
            }`}
          >
            <div>
              <h4 className="text-base font-bold text-white">{option.name}</h4>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">{option.tagline}</p>
            </div>
            <Link
              href={`${option.buyPath}?domain=${encodeURIComponent(domain)}&tool=domain-compare`}
              onClick={() => {
                const gtag = (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag;
                if (typeof gtag === "function") {
                  gtag("event", "affiliate_buy_click", { provider: option.slug, domain });
                }
                void recordEvent({
                  eventType: "buy_click",
                  toolSlug: "domain-compare",
                  domain,
                  providerSlug: option.slug,
                });
              }}
              className="inline-flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-white/10 text-white text-sm font-bold border border-white/10 hover:bg-white/15 transition-colors"
            >
              Search on {option.name}
              <ArrowUpRight className="w-4 h-4" />
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}
