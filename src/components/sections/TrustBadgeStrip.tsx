"use client";

import Link from "next/link";
import { useSiteContent } from "@/components/SiteContentProvider";

export function TrustBadgeStrip({ className = "" }: { className?: string }) {
  const { badges } = useSiteContent();
  if (!badges.length) return null;

  return (
    <div className={`flex flex-wrap justify-center md:justify-start gap-2 ${className}`}>
      {badges.map((badge) => {
        const inner = (
          <span className="inline-flex flex-col px-3 py-2 rounded-xl bg-white/5 border border-white/10">
            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">{badge.label}</span>
            <span className="text-[10px] text-slate-500 font-medium">{badge.note}</span>
          </span>
        );
        return badge.href ? (
          <Link key={badge.label} href={badge.href} className="hover:border-indigo-500/40">
            {inner}
          </Link>
        ) : (
          <span key={badge.label}>{inner}</span>
        );
      })}
    </div>
  );
}
