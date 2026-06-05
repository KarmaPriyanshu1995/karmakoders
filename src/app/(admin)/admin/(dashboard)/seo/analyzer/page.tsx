"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { ScoreGauge } from "@/components/admin/seo/ScoreGauge";
import { IssueList } from "@/components/admin/seo/IssueList";
import { IssueBadge } from "@/components/admin/seo/IssueBadge";
import { HealthProgress } from "@/components/admin/seo/HealthProgress";
import { useSeoPages, type SeoIssue, type SeoPageData } from "@/hooks/useSeoPages";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import {
  Search, RefreshCw, X, Sparkles, Save, Wrench,
  ScanSearch, Pencil, CheckCircle2, AlertCircle,
} from "lucide-react";
import { generateMetaTitle, generateMetaDescription } from "@/lib/seo/aiRecommender";
import { toast } from "sonner";

type ActiveFilter = "all" | "page" | "post" | "project";
type SortOption = "score_asc" | "score_desc" | "issues";

interface AnalysisResult {
  analysis: {
    metaTitle: string | null;
    metaDescription: string | null;
    h1: string | null;
    headings: Array<{ level: number; text: string }>;
    wordCount: number;
    readabilityScore: number;
    imagesCount: number;
    imagesWithAlt: number;
    hasFaq: boolean;
    keywordDensity: Record<string, number>;
    issues: Array<{ type: string; severity: string; description: string; suggestion: string }>;
    recommendations: string[];
  };
  scores: { technical: number; content: number; entity: number; internalLink: number; schema: number; ctr: number; overall: number };
  entities: Array<{ name: string; type: string; confidence: number }>;
  recommendations: Array<{ type: string; title: string; content: string; priority: string }>;
}

const FILTER_LABELS: Record<ActiveFilter, string> = {
  all: "All",
  page: "Pages",
  post: "Posts",
  project: "Projects",
};

function ScoreBar({ label, score, color }: { label: string; score: number; color: string }) {
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-slate-400 font-medium">{label}</span>
        <span className="font-black text-white">{Math.round(score)}</span>
      </div>
      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${score}%`, background: color }} />
      </div>
    </div>
  );
}

function deriveDisplayIssues(page: SeoPageData): SeoIssue[] {
  if (page.issues.length > 0) return page.issues;

  const inferred: SeoIssue[] = [];
  if (!page.metaTitle) {
    inferred.push({ type: "missing_meta_title", severity: "critical", description: "Page is missing a meta title." });
  }
  if (!page.metaDescription) {
    inferred.push({ type: "missing_meta_desc", severity: "critical", description: "Page is missing a meta description." });
  }
  if (!page.hasSchema) {
    inferred.push({ type: "weak_schema", severity: "important", description: "Page lacks structured data schema." });
  }
  if (page.isOrphan) {
    inferred.push({ type: "orphan_page", severity: "important", description: "Page has no internal links pointing to it." });
  }
  return inferred;
}

function getEditPageHref(page: SeoPageData): string {
  if (page.type === "post") return `/admin/blog/${page.id}`;
  if (page.type === "project") return `/admin/projects/${page.id}`;
  return `/admin/pages/${page.id}`;
}

export default function PageAnalyzerPage() {
  const { pageData, loading, error, refetch } = useSeoPages();

  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>("all");
  const [sortOption, setSortOption] = useState<SortOption>("score_asc");
  const debouncedSearch = useDebouncedValue(searchQuery, 300);

  const [selectedPage, setSelectedPage] = useState<SeoPageData | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [auditingId, setAuditingId] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [customTitle, setCustomTitle] = useState("");
  const [customDesc, setCustomDesc] = useState("");
  const [savingMeta, setSavingMeta] = useState(false);
  const [optimizingPage, setOptimizingPage] = useState(false);

  const [aiFixPage, setAiFixPage] = useState<SeoPageData | null>(null);
  const [aiFixTitle, setAiFixTitle] = useState("");
  const [aiFixDesc, setAiFixDesc] = useState("");
  const [aiFixSaving, setAiFixSaving] = useState(false);

  const filteredPages = useMemo(() => {
    const query = debouncedSearch.trim().toLowerCase();
    return pageData
      .filter((p) => activeFilter === "all" || p.type === activeFilter)
      .filter((p) => {
        if (!query) return true;
        return (
          p.title?.toLowerCase().includes(query) ||
          p.url.toLowerCase().includes(query) ||
          p.metaTitle?.toLowerCase().includes(query) ||
          p.metaDescription?.toLowerCase().includes(query)
        );
      })
      .sort((a, b) => {
        if (sortOption === "score_asc") return a.overallScore - b.overallScore;
        if (sortOption === "score_desc") return b.overallScore - a.overallScore;
        return b.issueCount - a.issueCount;
      });
  }, [pageData, activeFilter, debouncedSearch, sortOption]);

  const hasActiveFilters = debouncedSearch.trim() !== "" || activeFilter !== "all";

  const clearFilters = () => {
    setSearchQuery("");
    setActiveFilter("all");
  };

  const runLiveAudit = useCallback(async (page: SeoPageData, openSidebar = true) => {
    if (openSidebar) {
      setSelectedPage(page);
      setCustomTitle(page.metaTitle || "");
      setCustomDesc(page.metaDescription || "");
      setAnalysis(null);
    }
    setAnalyzing(true);
    setAuditingId(page.id);

    try {
      const res = await fetch(`/api/seo/pages/${page.id}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageType: page.type }),
      });
      if (!res.ok) throw new Error("Audit failed");
      const data = await res.json();
      if (openSidebar) setAnalysis(data);
      toast.success(`Live audit complete for "${page.title || "Untitled"}"`);
      await refetch();
    } catch (e) {
      console.error(e);
      toast.error("Failed to run live audit");
    } finally {
      setAnalyzing(false);
      setAuditingId(null);
    }
  }, [refetch]);

  const openAiQuickFix = (page: SeoPageData) => {
    setAiFixPage(page);
    setAiFixTitle(page.metaTitle || "");
    setAiFixDesc(page.metaDescription || "");
  };

  const handleAiGenerate = (target: "sidebar" | "modal") => {
    const page = target === "sidebar" ? selectedPage : aiFixPage;
    if (!page) return;
    const newTitle = generateMetaTitle({ title: page.title, url: page.url });
    const newDesc = generateMetaDescription({ title: page.title, url: page.url });
    if (target === "sidebar") {
      setCustomTitle(newTitle);
      setCustomDesc(newDesc);
    } else {
      setAiFixTitle(newTitle);
      setAiFixDesc(newDesc);
    }
    toast.success("AI meta tags generated!");
  };

  const saveMeta = async (page: SeoPageData, metaTitle: string, metaDescription: string, context: "sidebar" | "modal") => {
    const setSaving = context === "sidebar" ? setSavingMeta : setAiFixSaving;
    setSaving(true);
    try {
      const res = await fetch("/api/seo/pages", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: page.id, type: page.type, metaTitle, metaDescription }),
      });
      if (!res.ok) throw new Error("Save failed");
      toast.success("Meta tags applied to database!");
      await refetch();
      if (context === "sidebar") {
        runLiveAudit({ ...page, metaTitle, metaDescription });
      } else {
        setAiFixPage(null);
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to save meta tags");
    } finally {
      setSaving(false);
    }
  };

  const handleBulkOptimize = async () => {
    if (!selectedPage) return;
    setOptimizingPage(true);
    try {
      const res = await fetch(`/api/seo/pages/${selectedPage.id}/optimize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageType: selectedPage.type }),
      });
      if (!res.ok) throw new Error("Optimize failed");
      const data = await res.json();
      toast.success("Page optimized and updated in DB!");
      await refetch();
      setAnalysis(data);
      if (data.analysis) {
        setCustomTitle(data.analysis.metaTitle || "");
        setCustomDesc(data.analysis.metaDescription || "");
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to run bulk optimization");
    } finally {
      setOptimizingPage(false);
    }
  };

  return (
    <div className="flex gap-6 min-h-[calc(100vh-8rem)] relative overflow-hidden">
      <div className={`flex-1 space-y-6 transition-all duration-300 ${selectedPage ? "pr-[400px] xl:pr-[450px]" : ""}`}>
        <div>
          <h2 className="text-2xl font-black text-white">Page SEO Analyzer</h2>
          <p className="text-slate-400 text-sm mt-1">Analyze individual pages and fix SEO problems in real-time</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search pages..."
              className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#FFC300]/30"
            />
          </div>
          <div className="flex gap-2">
            {(["all", "page", "post", "project"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setActiveFilter(f)}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${activeFilter === f ? "bg-[#FFC300]/10 text-[#FFC300] border border-[#FFC300]/20" : "text-slate-400 hover:text-white border border-white/10 hover:border-white/20"}`}
              >
                {FILTER_LABELS[f]}
              </button>
            ))}
          </div>
          <select
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value as SortOption)}
            className="px-3 py-2 bg-[#1C1B1A] border border-white/10 rounded-xl text-xs text-slate-400 focus:outline-none focus:border-[#FFC300]/30"
          >
            <option value="score_asc">Worst Score First</option>
            <option value="score_desc">Best Score First</option>
            <option value="issues">Most Issues First</option>
          </select>
          <button
            onClick={() => refetch()}
            disabled={loading}
            className="p-2.5 rounded-xl border border-white/10 text-slate-400 hover:text-white hover:border-white/20 transition-all disabled:opacity-50"
            title="Refresh page data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        <div className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10 bg-white/2">
                  {["Page Details", "Type", "Overall Health", "Issues", "Actions"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-black text-slate-400 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading && pageData.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-12 text-slate-500">Loading pages...</td></tr>
                ) : filteredPages.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-12">
                      <div className="flex flex-col items-center gap-3 max-w-md mx-auto">
                        <Search className="w-8 h-8 text-slate-600" />
                        <p className="text-slate-400 text-sm">
                          {debouncedSearch.trim() ? (
                            <>No pages found matching <span className="text-white font-bold">&apos;{debouncedSearch}&apos;</span> in <span className="text-[#FFC300] font-bold">{FILTER_LABELS[activeFilter]}</span> category.</>
                          ) : (
                            <>No pages found in <span className="text-[#FFC300] font-bold">{FILTER_LABELS[activeFilter]}</span> category.</>
                          )}
                        </p>
                        {hasActiveFilters && (
                          <button
                            onClick={clearFilters}
                            className="text-xs font-bold text-[#FFC300] hover:text-white bg-[#FFC300]/10 hover:bg-[#FFC300]/20 border border-[#FFC300]/20 px-4 py-2 rounded-lg transition-all"
                          >
                            Clear filters to try again
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredPages.map((page) => {
                    const displayIssues = deriveDisplayIssues(page);
                    const isSelected = selectedPage?.id === page.id;
                    const isAuditing = auditingId === page.id;

                    return (
                      <tr key={`${page.type}-${page.id}`} className={`border-b border-white/5 hover:bg-white/3 transition-colors ${isSelected ? "bg-white/5" : ""}`}>
                        <td className="px-4 py-4">
                          <div>
                            <p className="text-sm font-bold text-white truncate max-w-[280px]">{page.title || "Untitled"}</p>
                            <p className="text-xs text-slate-500 truncate max-w-[280px] font-mono mt-0.5">{page.url}</p>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/5 text-slate-400 uppercase">{page.type}</span>
                        </td>
                        <td className="px-4 py-4">
                          <HealthProgress score={page.overallScore} />
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex flex-wrap gap-1 max-w-[220px]">
                            {displayIssues.length === 0 ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/20">
                                <CheckCircle2 className="w-3 h-3" /> Healthy
                              </span>
                            ) : (
                              displayIssues.slice(0, 4).map((issue, i) => (
                                <IssueBadge key={`${issue.type}-${i}`} issue={issue} />
                              ))
                            )}
                            {displayIssues.length > 4 && (
                              <span className="text-[10px] font-bold text-slate-500 px-1.5 py-0.5">+{displayIssues.length - 4}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => runLiveAudit(page)}
                              disabled={isAuditing}
                              title="Run Live Audit"
                              className="p-2 rounded-lg text-slate-400 hover:text-[#FFC300] bg-white/5 hover:bg-[#FFC300]/10 border border-white/10 hover:border-[#FFC300]/20 transition-all disabled:opacity-50"
                            >
                              <ScanSearch className={`w-4 h-4 ${isAuditing ? "animate-pulse" : ""}`} />
                            </button>
                            <button
                              onClick={() => openAiQuickFix(page)}
                              title="AI Quick Fix"
                              className="p-2 rounded-lg text-slate-400 hover:text-violet-400 bg-white/5 hover:bg-violet-500/10 border border-white/10 hover:border-violet-500/20 transition-all"
                            >
                              <Sparkles className="w-4 h-4" />
                            </button>
                            <Link
                              href={getEditPageHref(page)}
                              title="Edit Page"
                              className="p-2 rounded-lg text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all"
                            >
                              <Pencil className="w-4 h-4" />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {!loading && pageData.length > 0 && (
          <p className="text-xs text-slate-500">
            Showing {filteredPages.length} of {pageData.length} pages
            {debouncedSearch.trim() ? ` matching "${debouncedSearch}"` : ""}
          </p>
        )}
      </div>

      {/* Diagnostics Sidebar */}
      {selectedPage && (
        <aside className="fixed top-16 right-0 bottom-0 w-[400px] xl:w-[450px] bg-[#181716] border-l border-white/5 z-40 flex flex-col justify-between shadow-2xl transition-transform duration-300">
          <div className="p-5 border-b border-white/5 flex items-center justify-between">
            <div className="min-w-0">
              <span className="text-[10px] font-black text-[#FFC300] uppercase tracking-widest">{selectedPage.type} Diagnostics</span>
              <h3 className="text-base font-black text-white truncate mt-0.5">{selectedPage.title || "Untitled"}</h3>
            </div>
            <button onClick={() => setSelectedPage(null)} className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-6">
            {analyzing ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <RefreshCw className="w-8 h-8 text-[#FFC300] animate-spin" />
                <p className="text-sm text-slate-400 font-bold">Running SEO Scan...</p>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-5 p-4 rounded-xl bg-white/3 border border-white/5">
                  <ScoreGauge score={analysis?.scores.overall ?? selectedPage.overallScore} size="sm" showLabel={false} />
                  <div>
                    <h4 className="font-black text-white text-lg">{Math.round(analysis?.scores.overall ?? selectedPage.overallScore)}/100</h4>
                    <p className="text-xs text-slate-400">Audit Health Score</p>
                    <p className="text-[10px] text-slate-500 mt-1 font-mono">{selectedPage.url}</p>
                  </div>
                </div>

                {analysis && (
                  <div className="space-y-3">
                    <h4 className="text-xs font-black text-white uppercase tracking-wider">Metric Dimensions</h4>
                    <div className="space-y-2 bg-white/3 border border-white/5 p-4 rounded-xl">
                      <ScoreBar label="Technical Quality" score={analysis.scores.technical} color="#3b82f6" />
                      <ScoreBar label="Content Semantic Quality" score={analysis.scores.content} color="#8b5cf6" />
                      <ScoreBar label="Entity Coverage" score={analysis.scores.entity} color="#06b6d4" />
                      <ScoreBar label="Internal Links Score" score={analysis.scores.internalLink} color="#10b981" />
                      <ScoreBar label="Schema Richness" score={analysis.scores.schema} color="#f59e0b" />
                      <ScoreBar label="CTR Opportunity" score={analysis.scores.ctr} color="#ec4899" />
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black text-white uppercase tracking-wider">Metadata Optimizer</h4>
                    <button
                      onClick={() => handleAiGenerate("sidebar")}
                      className="flex items-center gap-1 text-[10px] font-black text-[#FFC300] hover:text-white uppercase tracking-wider px-2 py-1 rounded bg-[#FFC300]/10 border border-[#FFC300]/20"
                    >
                      <Sparkles className="w-3 h-3" /> AI Generate
                    </button>
                  </div>

                  <div className="space-y-3 bg-white/3 border border-white/5 p-4 rounded-xl">
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-[10px] font-bold text-slate-400">Meta Title</label>
                        <span className={`text-[10px] font-bold ${customTitle.length >= 50 && customTitle.length <= 60 ? "text-green-400" : "text-yellow-400"}`}>
                          {customTitle.length} chars (Target 50-60)
                        </span>
                      </div>
                      <input
                        value={customTitle}
                        onChange={(e) => setCustomTitle(e.target.value)}
                        placeholder="Page title meta tag..."
                        className="w-full px-3 py-2 bg-[#1C1B1A] border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-[#FFC300]/30"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-[10px] font-bold text-slate-400">Meta Description</label>
                        <span className={`text-[10px] font-bold ${customDesc.length >= 140 && customDesc.length <= 160 ? "text-green-400" : "text-yellow-400"}`}>
                          {customDesc.length} chars (Target 140-160)
                        </span>
                      </div>
                      <textarea
                        value={customDesc}
                        onChange={(e) => setCustomDesc(e.target.value)}
                        placeholder="Page description meta tag..."
                        rows={3}
                        className="w-full px-3 py-2 bg-[#1C1B1A] border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-[#FFC300]/30 resize-none"
                      />
                    </div>

                    <button
                      onClick={() => saveMeta(selectedPage, customTitle, customDesc, "sidebar")}
                      disabled={savingMeta}
                      className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-[#FFC300] text-[#1C1B1A] font-black text-xs hover:bg-[#FFD60A] transition-all disabled:opacity-60"
                    >
                      <Save className="w-3.5 h-3.5" />
                      {savingMeta ? "Saving..." : "Apply & Save to DB"}
                    </button>
                  </div>

                  <div className="space-y-2 mt-4 p-4 rounded-xl bg-gradient-to-r from-violet-600/10 to-indigo-600/10 border border-indigo-500/20">
                    <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                      <Wrench className="w-3.5 h-3.5 text-indigo-400" /> One-Click Bulk Optimizer
                    </h4>
                    <p className="text-[10px] text-slate-400 leading-normal">
                      Automatically generate optimized missing meta tags, insert descriptive ALT texts for all images, generate structured data schemas, and calculate internal link mappings.
                    </p>
                    <button
                      onClick={handleBulkOptimize}
                      disabled={optimizingPage}
                      className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-indigo-600 text-white font-black text-xs hover:bg-indigo-500 transition-all disabled:opacity-60 shadow-[0_0_15px_rgba(99,102,241,0.25)]"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      {optimizingPage ? "Optimizing Page..." : "Optimize Entire Page"}
                    </button>
                  </div>
                </div>

                {analysis && analysis.analysis.issues.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-xs font-black text-white uppercase tracking-wider">Identified Issues</h4>
                    <div className="bg-white/3 border border-white/5 p-4 rounded-xl">
                      <IssueList
                        issues={analysis.analysis.issues.map((i) => ({ ...i, severity: i.severity as "critical" | "important" | "recommended" }))}
                        maxItems={5}
                      />
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </aside>
      )}

      {/* AI Quick Fix Modal */}
      {aiFixPage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
        >
          <div className="relative w-full max-w-lg rounded-2xl border border-white/10 bg-[#181716] shadow-2xl p-6">
            <button
              onClick={() => setAiFixPage(null)}
              className="absolute top-4 right-4 p-1.5 text-slate-500 hover:text-white rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-violet-500/15 border border-violet-500/25 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-violet-400" />
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-black text-white">AI Quick Fix</h3>
                <p className="text-xs text-slate-400 truncate">{aiFixPage.title || "Untitled"} · {aiFixPage.url}</p>
              </div>
            </div>

            <p className="text-xs text-slate-400 mb-4">
              Generate missing meta title and description using AI, then apply directly to the database.
            </p>

            <div className="space-y-3">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[10px] font-bold text-slate-400">Meta Title</label>
                  <span className={`text-[10px] font-bold ${aiFixTitle.length >= 50 && aiFixTitle.length <= 60 ? "text-green-400" : "text-yellow-400"}`}>
                    {aiFixTitle.length} chars
                  </span>
                </div>
                <input
                  value={aiFixTitle}
                  onChange={(e) => setAiFixTitle(e.target.value)}
                  placeholder="Generated meta title..."
                  className="w-full px-3 py-2 bg-[#1C1B1A] border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-violet-500/30"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[10px] font-bold text-slate-400">Meta Description</label>
                  <span className={`text-[10px] font-bold ${aiFixDesc.length >= 140 && aiFixDesc.length <= 160 ? "text-green-400" : "text-yellow-400"}`}>
                    {aiFixDesc.length} chars
                  </span>
                </div>
                <textarea
                  value={aiFixDesc}
                  onChange={(e) => setAiFixDesc(e.target.value)}
                  placeholder="Generated meta description..."
                  rows={3}
                  className="w-full px-3 py-2 bg-[#1C1B1A] border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-violet-500/30 resize-none"
                />
              </div>
            </div>

            <div className="flex gap-2 mt-5">
              <button
                onClick={() => handleAiGenerate("modal")}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-violet-600/20 text-violet-300 font-black text-xs hover:bg-violet-600/30 border border-violet-500/25 transition-all"
              >
                <Sparkles className="w-3.5 h-3.5" /> Generate with AI
              </button>
              <button
                onClick={() => saveMeta(aiFixPage, aiFixTitle, aiFixDesc, "modal")}
                disabled={aiFixSaving || (!aiFixTitle && !aiFixDesc)}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-[#FFC300] text-[#1C1B1A] font-black text-xs hover:bg-[#FFD60A] transition-all disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                {aiFixSaving ? "Saving..." : "Apply Fix"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
