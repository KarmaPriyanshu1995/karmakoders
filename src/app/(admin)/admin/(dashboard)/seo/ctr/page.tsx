"use client";

import { useState } from "react";
import { MousePointerClick, TrendingUp, Eye, RefreshCw, Copy, Check } from "lucide-react";
import { generateMetaTitle, generateMetaDescription } from "@/lib/seo/aiRecommender";

const SAMPLE_PAGES = [
  { id: "1", url: "/", title: "Karmakoders — Web Development Company", impressions: 850, ctr: 1.2, avgPosition: 8.5, expectedCtr: 4.5 },
  { id: "2", url: "/services/web-development", title: "Web Development Services", impressions: 450, ctr: 0.8, avgPosition: 12.1, expectedCtr: 3.8 },
  { id: "3", url: "/blog/react-tutorial", title: "React Tutorial for Beginners", impressions: 320, ctr: 1.5, avgPosition: 7.2, expectedCtr: 5.2 },
  { id: "4", url: "/about", title: "About Karmakoders", impressions: 180, ctr: 2.8, avgPosition: 4.1, expectedCtr: 7.0 },
  { id: "5", url: "/services/mobile", title: "Mobile App Development", impressions: 290, ctr: 0.7, avgPosition: 15.3, expectedCtr: 2.5 },
];

interface CopiedState { [key: string]: boolean }

export default function CtrOptimizationPage() {
  const [pages] = useState(SAMPLE_PAGES);
  const [generating, setGenerating] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<Record<string, { title: string; description: string }>>({});
  const [copied, setCopied] = useState<CopiedState>({});

  const handleGenerate = async (pageId: string, title: string, url: string) => {
    setGenerating(pageId);
    await new Promise((r) => setTimeout(r, 600));
    const newTitle = generateMetaTitle({ title, url });
    const newDesc = generateMetaDescription({ title, url });
    setSuggestions((p) => ({ ...p, [pageId]: { title: newTitle, description: newDesc } }));
    setGenerating(null);
  };

  const handleCopy = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopied((p) => ({ ...p, [key]: true }));
    setTimeout(() => setCopied((p) => ({ ...p, [key]: false })), 2000);
  };

  const avgCtr = pages.reduce((s, p) => s + p.ctr, 0) / pages.length;
  const avgExpected = pages.reduce((s, p) => s + p.expectedCtr, 0) / pages.length;
  const potentialGain = ((avgExpected - avgCtr) / avgCtr * 100).toFixed(0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black text-white">CTR Optimization Center</h2>
        <p className="text-slate-400 text-sm mt-1">Identify low-CTR pages and generate better titles and descriptions to increase click-through rate</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
          <div className="flex items-center gap-2 mb-2"><MousePointerClick className="w-4 h-4 text-[#FFC300]" /><span className="text-xs text-slate-400 font-bold">Avg CTR</span></div>
          <p className="text-3xl font-black text-white">{avgCtr.toFixed(1)}%</p>
          <p className="text-xs text-slate-500 mt-1">Current across all pages</p>
        </div>
        <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
          <div className="flex items-center gap-2 mb-2"><TrendingUp className="w-4 h-4 text-green-400" /><span className="text-xs text-slate-400 font-bold">Expected CTR</span></div>
          <p className="text-3xl font-black text-white">{avgExpected.toFixed(1)}%</p>
          <p className="text-xs text-slate-500 mt-1">If optimized to position average</p>
        </div>
        <div className="p-5 rounded-2xl bg-green-500/10 border border-green-500/20">
          <div className="flex items-center gap-2 mb-2"><TrendingUp className="w-4 h-4 text-green-400" /><span className="text-xs text-green-400 font-bold">Potential Gain</span></div>
          <p className="text-3xl font-black text-green-400">+{potentialGain}%</p>
          <p className="text-xs text-slate-500 mt-1">More clicks if CTR improved</p>
        </div>
      </div>

      {/* Pages list */}
      <div className="space-y-4">
        <h3 className="font-black text-white">Low CTR Pages</h3>
        {pages.sort((a, b) => a.ctr - b.ctr).map((page) => {
          const ctrGap = page.expectedCtr - page.ctr;
          const hasSuggestion = !!suggestions[page.id];
          return (
            <div key={page.id} className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
              <div className="p-5">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-black text-white truncate">{page.title}</p>
                    <p className="text-xs text-slate-500 font-mono mt-0.5">{page.url}</p>
                  </div>
                  <button
                    onClick={() => handleGenerate(page.id, page.title, page.url)}
                    disabled={generating === page.id}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#FFC300] text-[#1C1B1A] font-black text-xs hover:bg-[#FFD60A] transition-all disabled:opacity-50 flex-shrink-0"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${generating === page.id ? "animate-spin" : ""}`} />
                    AI Optimize
                  </button>
                </div>

                <div className="grid grid-cols-4 gap-3 mb-4">
                  {[
                    { label: "Impressions", value: page.impressions.toLocaleString(), icon: Eye, color: "#3b82f6" },
                    { label: "Current CTR", value: `${page.ctr}%`, icon: MousePointerClick, color: page.ctr < 2 ? "#ef4444" : "#FFC300" },
                    { label: "Expected CTR", value: `${page.expectedCtr}%`, icon: TrendingUp, color: "#10b981" },
                    { label: "CTR Gap", value: `+${ctrGap.toFixed(1)}%`, icon: TrendingUp, color: "#8b5cf6" },
                  ].map((stat) => (
                    <div key={stat.label} className="p-3 rounded-xl bg-white/5">
                      <div className="flex items-center gap-1 mb-1">
                        <stat.icon className="w-3 h-3" style={{ color: stat.color }} />
                        <span className="text-xs text-slate-500">{stat.label}</span>
                      </div>
                      <p className="text-sm font-black" style={{ color: stat.color }}>{stat.value}</p>
                    </div>
                  ))}
                </div>

                {/* CTR bar visualization */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <span className="w-24">Current CTR</span>
                    <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-red-400" style={{ width: `${Math.min(page.ctr / 10 * 100, 100)}%` }} />
                    </div>
                    <span className="w-10 text-right">{page.ctr}%</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <span className="w-24">Expected CTR</span>
                    <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-green-400" style={{ width: `${Math.min(page.expectedCtr / 10 * 100, 100)}%` }} />
                    </div>
                    <span className="w-10 text-right">{page.expectedCtr}%</span>
                  </div>
                </div>
              </div>

              {/* AI Suggestions */}
              {hasSuggestion && (
                <div className="border-t border-white/10 p-5 space-y-4 bg-[#FFC300]/3">
                  <h4 className="text-xs font-black text-[#FFC300] uppercase tracking-wider">AI Generated Optimizations</h4>
                  {[
                    { label: "Optimized Title", value: suggestions[page.id].title, key: `title-${page.id}` },
                    { label: "Optimized Meta Description", value: suggestions[page.id].description, key: `desc-${page.id}` },
                  ].map((item) => (
                    <div key={item.key}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-slate-400">{item.label}</span>
                        <button onClick={() => handleCopy(item.key, item.value)} className="flex items-center gap-1 text-xs text-slate-400 hover:text-[#FFC300] transition-colors">
                          {copied[item.key] ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                          {copied[item.key] ? "Copied" : "Copy"}
                        </button>
                      </div>
                      <p className="p-3 rounded-xl bg-white/5 border border-white/10 text-sm text-white">{item.value}</p>
                      <p className="text-xs text-slate-500 mt-1">{item.value.length} chars</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
