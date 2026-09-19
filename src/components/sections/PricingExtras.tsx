"use client";

import Link from "next/link";
import { useSiteContent } from "@/components/SiteContentProvider";

export function PricingExtras() {
  const { pricing } = useSiteContent();
  return (
    <div className="mt-20 space-y-16">
      <p className="text-center text-sm text-slate-500">{pricing.disclaimer}</p>

      <div className="rounded-[2rem] border border-white/10 bg-white/5 p-8 md:p-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-indigo-400 mb-2">Retainer</p>
          <h3 className="text-3xl font-black text-white">{pricing.retainer.name}</h3>
          <p className="text-2xl font-bold text-white mt-2">{pricing.retainer.from}</p>
          <p className="text-slate-400 mt-2 max-w-xl">{pricing.retainer.description}</p>
          <p className="text-sm text-slate-500 mt-1">{pricing.retainer.typical}</p>
        </div>
        <Link
          href="/contact"
          className="px-8 py-4 rounded-xl bg-indigo-500 text-slate-950 font-black text-center shrink-0"
        >
          Ask about a retainer
        </Link>
      </div>

      <div className="overflow-x-auto rounded-[2rem] border border-white/10">
        <table className="w-full min-w-[640px] text-left">
          <thead className="bg-white/5 text-slate-400 text-xs uppercase tracking-widest">
            <tr>
              <th className="px-6 py-4 font-bold">Compare</th>
              <th className="px-6 py-4 font-bold">Starter</th>
              <th className="px-6 py-4 font-bold">Growth</th>
              <th className="px-6 py-4 font-bold">Enterprise</th>
            </tr>
          </thead>
          <tbody>
            {pricing.comparison.map((row) => (
              <tr key={row.label} className="border-t border-white/10 text-sm">
                <td className="px-6 py-4 font-bold text-white">{row.label}</td>
                <td className="px-6 py-4 text-slate-300">{row.starter}</td>
                <td className="px-6 py-4 text-slate-300">{row.growth}</td>
                <td className="px-6 py-4 text-slate-300">{row.enterprise}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="max-w-3xl mx-auto space-y-4">
        <h3 className="text-2xl font-black text-white text-center mb-8">Pricing FAQ</h3>
        {pricing.faqs.map((faq) => (
          <details key={faq.question} className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <summary className="cursor-pointer font-bold text-white">{faq.question}</summary>
            <p className="mt-3 text-slate-400 leading-relaxed">{faq.answer}</p>
          </details>
        ))}
      </div>
    </div>
  );
}
