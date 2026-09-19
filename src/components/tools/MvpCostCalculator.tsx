"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Calculator, Mail, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  COMPLIANCE_OPTIONS,
  FEATURE_TIERS,
  USER_LOADS,
  estimateMvpCost,
  formatUsdRange,
  mvpEstimateMessage,
  type ComplianceId,
  type FeatureTierId,
  type UserLoadId,
} from "@/lib/tools/mvp-cost";
import { DEFAULT_WHATSAPP_NUMBER } from "@/lib/content/post-types";

export function MvpCostCalculator({ compact = false }: { compact?: boolean }) {
  const [userLoad, setUserLoad] = useState<UserLoadId>("under-1k");
  const [tier, setTier] = useState<FeatureTierId>("starter");
  const [compliance, setCompliance] = useState<ComplianceId>("none");

  const estimate = useMemo(
    () => estimateMvpCost({ userLoad, tier, compliance }),
    [userLoad, tier, compliance]
  );

  const message = mvpEstimateMessage(estimate);
  const whatsapp = (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || DEFAULT_WHATSAPP_NUMBER).replace(/\D/g, "");
  const waHref = `https://wa.me/${whatsapp}?text=${encodeURIComponent(message)}`;
  const mailHref = `mailto:info@karmakoders.com?subject=${encodeURIComponent("MVP technical roadmap")}&body=${encodeURIComponent(message)}`;

  return (
    <div className={`rounded-2xl border border-white/10 bg-white/[0.03] ${compact ? "p-5" : "p-6 md:p-8"}`}>
      <div className="flex items-start gap-3 mb-6">
        <span className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
          <Calculator className="w-5 h-5" />
        </span>
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-indigo-400">MVP Cost Calculator</p>
          <h3 className="text-xl font-bold text-white mt-1">Instant build estimate</h3>
          <p className="text-sm text-slate-400 mt-1">
            Adjust user load, feature tier, and compliance. This is a planning range, not a quote.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <label className="text-sm text-slate-300">
          Expected user load
          <select
            value={userLoad}
            onChange={(e) => setUserLoad(e.target.value as UserLoadId)}
            className="mt-2 w-full h-11 bg-slate-950 border border-slate-800 rounded-xl px-3 text-white outline-none focus:border-indigo-500"
          >
            {USER_LOADS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm text-slate-300">
          Feature tier
          <select
            value={tier}
            onChange={(e) => setTier(e.target.value as FeatureTierId)}
            className="mt-2 w-full h-11 bg-slate-950 border border-slate-800 rounded-xl px-3 text-white outline-none focus:border-indigo-500"
          >
            {FEATURE_TIERS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm text-slate-300">
          Compliance
          <select
            value={compliance}
            onChange={(e) => setCompliance(e.target.value as ComplianceId)}
            className="mt-2 w-full h-11 bg-slate-950 border border-slate-800 rounded-xl px-3 text-white outline-none focus:border-indigo-500"
          >
            {COMPLIANCE_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-6 rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-5">
        <p className="text-sm text-slate-400">{estimate.summary}</p>
        <p className="text-3xl font-black text-white mt-2">{formatUsdRange(estimate.low, estimate.high)}</p>
        <p className="text-sm text-indigo-300 mt-1">About {estimate.weeks} weeks to a production-ready MVP</p>
      </div>

      <div className="mt-5 flex flex-col sm:flex-row gap-3">
        <Button asChild className="bg-indigo-600 hover:bg-indigo-500 text-white">
          <a href={waHref} target="_blank" rel="noopener noreferrer">
            <MessageCircle className="w-4 h-4 mr-2" /> Export via WhatsApp
          </a>
        </Button>
        <Button asChild variant="glass">
          <a href={mailHref}>
            <Mail className="w-4 h-4 mr-2" /> Email this roadmap
          </a>
        </Button>
        {!compact && (
          <Button asChild variant="ghost" className="text-slate-300">
            <Link href="/contact">Talk to an architect</Link>
          </Button>
        )}
      </div>
    </div>
  );
}
