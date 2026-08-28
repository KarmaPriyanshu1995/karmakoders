"use client";

import Link from "next/link";
import { ExternalLink } from "lucide-react";
import type { AffiliateBuyOption } from "@/components/tools/domain-compare-types";

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
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 md:p-8 space-y-5">
      <div>
        <h3 className="text-lg font-bold text-white">Also available at these registrars</h3>
        <p className="text-sm text-slate-400 mt-1">
          Live API pricing is shown above for GoDaddy and Hostinger. Buy buttons use our affiliate links — we may earn a
          commission at no extra cost to you.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {options.map((option) => (
          <article
            key={option.slug}
            className="rounded-xl border border-white/10 bg-slate-950/40 p-5 flex flex-col justify-between gap-4"
          >
            <div>
              <h4 className="text-base font-bold text-white">{option.name}</h4>
              <p className="text-xs text-slate-500 mt-1">{option.tagline}</p>
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
              className="inline-flex items-center justify-center gap-2 w-full py-3 rounded-xl border border-indigo-500/30 bg-indigo-500/10 text-indigo-200 text-sm font-bold hover:bg-indigo-500/20 transition-colors"
            >
              Search on {option.name}
              <ExternalLink className="w-4 h-4" />
            </Link>
          </article>
        ))}
      </div>

      <p className="text-[11px] text-slate-500">
        Searching for <span className="text-slate-400">{domain}</span> — prices on partner sites may differ from live quotes above.
      </p>
    </section>
  );
}
