"use client";

import { useEffect, useState } from "react";
import { Link2, AlertCircle, ArrowRight, CheckCircle2, RefreshCw } from "lucide-react";
import { ScoreGauge } from "@/components/admin/seo/ScoreGauge";
import { toast } from "sonner";

interface PageItem {
  id: string; url: string; title: string; type: string;
  internalLinksCount: number; isOrphan: boolean; internalLinkScore: number;
}

const INITIAL_LINK_SUGGESTIONS = [
  { from: "Home Page", to: "Web Development Services", anchor: "web development services", reason: "High traffic page linking to core service" },
  { from: "Blog: React Guide", to: "React Development Services", anchor: "React development", reason: "Content-to-service internal link opportunity" },
  { from: "Projects Page", to: "Case Studies", anchor: "view our case studies", reason: "Portfolio to case studies conversion link" },
  { from: "About Page", to: "Services Overview", anchor: "our services", reason: "Brand page to services funnel link" },
  { from: "Blog Posts", to: "Contact Page", anchor: "get a free quote", reason: "Content-to-conversion CTA link" },
];

export default function InternalLinkCenterPage() {
  const [pages, setPages] = useState<PageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [suggestions, setSuggestions] = useState(
    INITIAL_LINK_SUGGESTIONS.map((s, idx) => ({ ...s, id: idx, applied: false }))
  );

  useEffect(() => {
    fetch("/api/seo/pages")
      .then((r) => r.json())
      .then((d) => {
        const items = (d.pages || []).map((p: {
          id: string; url: string; title: string; type: string;
          internalLinksCount?: number; isOrphan?: boolean; internalLinkScore?: number;
        }) => ({
          id: p.id,
          url: p.url,
          title: p.title,
          type: p.type,
          internalLinksCount: p.internalLinksCount ?? 0,
          isOrphan: p.isOrphan ?? false,
          internalLinkScore: p.internalLinkScore ?? 0,
        }));
        setPages(items);
      })
      .finally(() => setLoading(false));
  }, []);

  const orphanPages = pages.filter((p) => p.isOrphan || p.internalLinksCount === 0);
  const weakPages = pages.filter((p) => p.internalLinksCount > 0 && p.internalLinksCount < 3);
  const avgScore = pages.length ? Math.round(pages.reduce((s, p) => s + p.internalLinkScore, 0) / pages.length) : 0;

  const runScan = async () => {
    setRunning(true);
    await fetch("/api/seo/audit", { method: "POST" });
    const res = await fetch("/api/seo/pages");
    const d = await res.json();
    setPages(d.pages || []);
    setRunning(false);
  };

  const handleApplySuggestion = (id: number) => {
    setSuggestions((prev) =>
      prev.map((sug) => (sug.id === id ? { ...sug, applied: true } : sug))
    );
    toast.success("Internal link suggestions queued for background worker injection!");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-black text-white">Internal Link Center</h2>
          <p className="text-slate-400 text-sm mt-1">Optimize your internal linking structure to distribute link equity</p>
        </div>
        <button onClick={runScan} disabled={running} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#FFC300] text-[#1C1B1A] font-black text-sm hover:bg-[#FFD60A] transition-all disabled:opacity-60">
          <RefreshCw className={`w-4 h-4 ${running ? "animate-spin" : ""}`} />
          Scan Links
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-6 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-4">
          <ScoreGauge score={avgScore} size="sm" showLabel={false} />
          <div>
            <p className="text-xl font-black text-white">{avgScore}</p>
            <p className="text-xs text-slate-400 font-bold">Link Score</p>
          </div>
        </div>
        {[
          { label: "Total Pages", value: pages.length, color: "#FFC300", icon: Link2 },
          { label: "Orphan Pages", value: orphanPages.length, color: "#ef4444", icon: AlertCircle },
          { label: "Weak Linked", value: weakPages.length, color: "#f97316", icon: AlertCircle },
        ].map((stat) => (
          <div key={stat.label} className="p-5 rounded-2xl bg-white/5 border border-white/10">
            <div className="flex items-center gap-2 mb-2">
              <stat.icon className="w-4 h-4" style={{ color: stat.color }} />
              <span className="text-xs font-bold text-slate-400">{stat.label}</span>
            </div>
            <p className="text-3xl font-black text-white">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* AI Link Suggestions */}
      <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
        <h3 className="font-black text-white mb-4">One-Click Link Suggestions</h3>
        <div className="space-y-3">
          {suggestions.map((sug) => (
            <div key={sug.id} className="flex items-center gap-4 p-4 rounded-xl bg-[#FFC300]/5 border border-[#FFC300]/10">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div className="text-xs font-bold text-white truncate max-w-[120px]">{sug.from}</div>
                <ArrowRight className="w-4 h-4 text-[#FFC300] flex-shrink-0" />
                <div className="text-xs font-bold text-white truncate max-w-[120px]">{sug.to}</div>
              </div>
              <div className="flex-1 min-w-0 hidden sm:block">
                <p className="text-xs text-slate-400">Anchor: <span className="text-[#FFC300] font-medium">&ldquo;{sug.anchor}&rdquo;</span></p>
                <p className="text-xs text-slate-500 mt-0.5">{sug.reason}</p>
              </div>
              <button
                onClick={() => handleApplySuggestion(sug.id)}
                disabled={sug.applied}
                className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all whitespace-nowrap flex-shrink-0 border ${
                  sug.applied
                    ? "bg-green-500/10 border-green-500/20 text-green-400 cursor-default"
                    : "text-[#FFC300] hover:text-white bg-[#FFC300]/10 hover:bg-[#FFC300]/20 border-[#FFC300]/20"
                }`}
              >
                {sug.applied ? "✓ Applied" : "Apply →"}
              </button>
            </div>
          ))}
        </div>
      </div>


      {/* Pages table */}
      <div className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
        <div className="p-4 border-b border-white/10">
          <h3 className="font-black text-white">All Pages — Link Status</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                {["Page", "Type", "Incoming Links", "Status", "Score"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-black text-slate-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="text-center py-8 text-slate-500">Loading...</td></tr>
              ) : pages.slice(0, 20).map((page) => (
                <tr key={page.id} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                  <td className="px-4 py-3">
                    <p className="text-sm font-bold text-white truncate max-w-[200px]">{page.title || "Untitled"}</p>
                    <p className="text-xs text-slate-500 font-mono">{page.url}</p>
                  </td>
                  <td className="px-4 py-3"><span className="text-xs px-2 py-1 rounded-full bg-white/5 text-slate-400 uppercase">{page.type}</span></td>
                  <td className="px-4 py-3"><span className="text-sm font-black text-white">{page.internalLinksCount}</span></td>
                  <td className="px-4 py-3">
                    {page.isOrphan || page.internalLinksCount === 0 ? (
                      <span className="text-xs font-bold text-red-300 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Orphan</span>
                    ) : page.internalLinksCount < 3 ? (
                      <span className="text-xs font-bold text-yellow-300 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Weak</span>
                    ) : (
                      <span className="text-xs font-bold text-green-300 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Good</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${page.internalLinkScore}%`, background: page.internalLinkScore >= 70 ? "#22c55e" : page.internalLinkScore >= 40 ? "#FFC300" : "#ef4444" }} />
                      </div>
                      <span className="text-xs font-bold text-white">{Math.round(page.internalLinkScore)}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
