"use client";

import { useState } from "react";
import { Link2, AlertCircle, ArrowRight, CheckCircle2, RefreshCw } from "lucide-react";
import { ScoreGauge } from "@/components/admin/seo/ScoreGauge";
import { useSeoPages } from "@/hooks/useSeoPages";
import {
  useInternalLinkRecommendations,
  type RecommendationType,
} from "@/hooks/useInternalLinkRecommendations";
import { toast } from "sonner";

const TYPE_LABELS: Record<RecommendationType, string> = {
  topical_overlap: "Topical",
  orphan_recovery: "Orphan Fix",
  weak_link_boost: "Weak Link",
  funnel: "Funnel",
};

export default function InternalLinkCenterPage() {
  const { pageData, loading: pagesLoading, error: pagesError, refetch: refetchPages } = useSeoPages();
  const {
    recommendations,
    loading: recsLoading,
    error: recsError,
    applyingId,
    refetch: refetchRecs,
    applyRecommendation,
  } = useInternalLinkRecommendations();
  const [running, setRunning] = useState(false);

  const pages = pageData.map((p) => ({
    id: p.id,
    url: p.url,
    title: p.title,
    type: p.type,
    internalLinksCount: p.internalLinksCount,
    isOrphan: p.isOrphan,
    internalLinkScore: p.internalLinkScore,
  }));

  const orphanPages = pages.filter((p) => p.isOrphan || p.internalLinksCount === 0);
  const weakPages = pages.filter((p) => p.internalLinksCount > 0 && p.internalLinksCount < 3);
  const avgScore = pages.length
    ? Math.round(pages.reduce((s, p) => s + p.internalLinkScore, 0) / pages.length)
    : 0;

  const runScan = async () => {
    setRunning(true);
    try {
      const res = await fetch("/api/seo/audit", { method: "POST" });
      if (!res.ok) throw new Error("Audit failed");
      await Promise.all([refetchPages(), refetchRecs()]);
      toast.success("Link scan complete");
    } catch {
      toast.error("Failed to run link scan");
    } finally {
      setRunning(false);
    }
  };

  const handleApply = async (id: string) => {
    const result = await applyRecommendation(id);
    if (result.success) {
      toast.success(result.message || "Internal link applied successfully");
    } else {
      toast.error(result.error || "Failed to apply recommendation");
    }
  };

  const loading = pagesLoading || recsLoading;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-black text-white">Internal Link Center</h2>
          <p className="text-slate-400 text-sm mt-1">
            Optimize your internal linking structure to distribute link equity
          </p>
        </div>
        <button
          onClick={runScan}
          disabled={running}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#FFC300] text-[#1C1B1A] font-black text-sm hover:bg-[#FFD60A] transition-all disabled:opacity-60"
        >
          <RefreshCw className={`w-4 h-4 ${running ? "animate-spin" : ""}`} />
          Scan Links
        </button>
      </div>

      {(recsError || pagesError) && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {recsError || pagesError}
        </div>
      )}

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
        {recsLoading ? (
          <p className="text-center py-8 text-slate-500">Loading recommendations...</p>
        ) : recommendations.length === 0 ? (
          <div className="text-center py-8 space-y-4">
            <p className="text-slate-400 text-sm">
              No link suggestions yet. Run Scan Links or enable automation.
            </p>
            <button
              onClick={runScan}
              disabled={running}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#FFC300]/10 border border-[#FFC300]/20 text-[#FFC300] font-bold text-sm hover:bg-[#FFC300]/20 transition-all disabled:opacity-60"
            >
              <RefreshCw className={`w-4 h-4 ${running ? "animate-spin" : ""}`} />
              Scan Links
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {recommendations.map((rec) => (
              <div
                key={rec.id}
                className="flex items-center gap-4 p-4 rounded-xl bg-[#FFC300]/5 border border-[#FFC300]/10"
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div className="text-xs font-bold text-white truncate max-w-[120px]">
                    {rec.sourcePage.title}
                  </div>
                  <ArrowRight className="w-4 h-4 text-[#FFC300] flex-shrink-0" />
                  <div className="text-xs font-bold text-white truncate max-w-[120px]">
                    {rec.targetPage.title}
                  </div>
                </div>
                <div className="flex-1 min-w-0 hidden sm:block">
                  <p className="text-xs text-slate-400">
                    Anchor:{" "}
                    <span className="text-[#FFC300] font-medium">
                      &ldquo;{rec.anchorText}&rdquo;
                    </span>
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">{rec.reason}</p>
                </div>
                <div className="hidden md:flex items-center gap-2 flex-shrink-0">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/5 text-slate-400">
                    {TYPE_LABELS[rec.recommendationType]}
                  </span>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-[#FFC300]/10 text-[#FFC300]">
                    {rec.relevanceScore}
                  </span>
                </div>
                <button
                  onClick={() => handleApply(rec.id)}
                  disabled={applyingId === rec.id}
                  className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all whitespace-nowrap flex-shrink-0 border ${
                    applyingId === rec.id
                      ? "bg-white/5 border-white/10 text-slate-500 cursor-wait"
                      : "text-[#FFC300] hover:text-white bg-[#FFC300]/10 hover:bg-[#FFC300]/20 border-[#FFC300]/20"
                  }`}
                >
                  {applyingId === rec.id ? "Applying..." : "Apply →"}
                </button>
              </div>
            ))}
          </div>
        )}
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
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-xs font-black text-slate-400 uppercase tracking-wider"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-slate-500">
                    Loading...
                  </td>
                </tr>
              ) : pages.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-slate-500">
                    No pages found. Run a site audit to populate link data.
                  </td>
                </tr>
              ) : (
                pages.slice(0, 20).map((page) => (
                  <tr
                    key={page.id}
                    className="border-b border-white/5 hover:bg-white/3 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <p className="text-sm font-bold text-white truncate max-w-[200px]">
                        {page.title || "Untitled"}
                      </p>
                      <p className="text-xs text-slate-500 font-mono">{page.url}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-1 rounded-full bg-white/5 text-slate-400 uppercase">
                        {page.type}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-black text-white">
                        {page.internalLinksCount}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {page.isOrphan || page.internalLinksCount === 0 ? (
                        <span className="text-xs font-bold text-red-300 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> Orphan
                        </span>
                      ) : page.internalLinksCount < 3 ? (
                        <span className="text-xs font-bold text-yellow-300 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> Weak
                        </span>
                      ) : (
                        <span className="text-xs font-bold text-green-300 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Good
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${page.internalLinkScore}%`,
                              background:
                                page.internalLinkScore >= 70
                                  ? "#22c55e"
                                  : page.internalLinkScore >= 40
                                    ? "#FFC300"
                                    : "#ef4444",
                            }}
                          />
                        </div>
                        <span className="text-xs font-bold text-white">
                          {Math.round(page.internalLinkScore)}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
