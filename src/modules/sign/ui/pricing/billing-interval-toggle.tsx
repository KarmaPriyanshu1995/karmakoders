"use client";

import { useState, type ReactNode } from "react";

export type BillingInterval = "month" | "year";

/**
 * Monthly/Yearly toggle (allowed Client Component). Plan cards are server-rendered with BOTH
 * prices; this only flips data-interval on the wrapper, and CSS (group-data-*) shows the
 * matching price, so there is no layout shift and no price data in client JS.
 */
export function BillingIntervalToggle({ children }: { children: ReactNode }) {
  const [interval, setInterval] = useState<BillingInterval>("month");

  const option = (value: BillingInterval, label: ReactNode) => (
    <button
      type="button"
      aria-pressed={interval === value}
      onClick={() => setInterval(value)}
      className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFC300] focus-visible:ring-offset-2 focus-visible:ring-offset-[#252422] ${
        interval === value ? "bg-[#FFC300] text-[#1C1B1A]" : "text-white hover:bg-white/10"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="group space-y-8" data-interval={interval}>
      <div role="group" aria-label="Billing period" className="inline-flex rounded-xl border border-white/10 bg-[#1C1B1A] p-1">
        {option("month", "Monthly")}
        {option(
          "year",
          <>
            Yearly <span className="ml-1 text-xs font-bold">2 months free</span>
          </>
        )}
      </div>
      {children}
    </div>
  );
}
