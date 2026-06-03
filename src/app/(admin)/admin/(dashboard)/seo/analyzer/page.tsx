"use client";

import { useEffect, useState } from "react";
import { ScoreGauge } from "@/components/admin/seo/ScoreGauge";
import { IssueList } from "@/components/admin/seo/IssueList";
import {
  Search, RefreshCw, AlertCircle, CheckCircle2,
  X, Sparkles, Save, HelpCircle, Eye, MousePointerClick, Wrench
} from "lucide-react";
import { getScoreColor } from "@/lib/seo/scorer";
import { generateMetaTitle, generateMetaDescription } from "@/lib/seo/aiRecommender";
import { toast } from "sonner";

interface SeoPageData {
  id: string; type: string; url: string; title: string;
  metaTitle: string | null; metaDescription: string | null;
  overallScore: number; technicalScore: number; contentScore: number;
  entityScore: number; schemaScore: number; internalLinkScore: number; ctrScore: number;
  wordCount: number; hasFaq: boolean; hasSchema: boolean; isOrphan: boolean;
  lastAnalyzed: string | null; issueCount: number;
}

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

export default function PageAnalyzerPage() {
  const [pages, setPages] = useState<SeoPageData[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "page" | "post" | "project">("all");
  const [sort, setSort] = useState<"score_asc" | "score_desc" | "issues">("score_asc");
  const [search, setSearch] = useState("");

  // Sidebar states
  const [selectedPage, setSelectedPage] = useState<SeoPageData | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [customTitle, setCustomTitle] = useState("");
  const [customDesc, setCustomDesc] = useState("");
  const [savingMeta, setSavingMeta] = useState(false);
  const [optimizingPage, setOptimizingPage] = useState(false);

  const fetchPages = () => {
    fetch("/api/seo/pages")
      .then((r) => r.json())
      .then((d) => setPages(d.pages || []))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchPages();
  }, []);

  const handleOpenDiagnostics = async (page: SeoPageData) => {
    setSelectedPage(page);
    setCustomTitle(page.metaTitle || "");
    setCustomDesc(page.metaDescription || "");
    setAnalysis(null);
    setAnalyzing(true);

    try {
      const res = await fetch(`/api/seo/pages/${page.id}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageType: page.type }),
      });
      const data = await res.json();
      setAnalysis(data);
    } catch (e) {
      console.error(e);
      toast.error("Failed to run diagnostics");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleAiGenerate = () => {
    if (!selectedPage) return;
    const newTitle = generateMetaTitle({ title: selectedPage.title, url: selectedPage.url });
    const newDesc = generateMetaDescription({ title: selectedPage.title, url: selectedPage.url });
    setCustomTitle(newTitle);
    setCustomDesc(newDesc);
    toast.success("AI meta tags generated!");
  };

  const handleSaveMeta = async () => {
    if (!selectedPage) return;
    setSavingMeta(true);
    try {
      const res = await fetch("/api/seo/pages", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedPage.id,
          type: selectedPage.type,
          metaTitle: customTitle,
          metaDescription: customDesc,
        }),
      });
      if (res.ok) {
        toast.success("Meta tags applied to database!");
        fetchPages();
        // Refresh analysis
        handleOpenDiagnostics({
          ...selectedPage,
          metaTitle: customTitle,
          metaDescription: customDesc
        });
      } else {
        toast.error("Failed to save meta tags");
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to save meta tags");
    } finally {
      setSavingMeta(false);
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
      if (res.ok) {
        const data = await res.json();
        toast.success("Page optimized and updated in DB!");
        fetchPages();
        setAnalysis(data);
        if (data.analysis) {
          setCustomTitle(data.analysis.metaTitle || "");
          setCustomDesc(data.analysis.metaDescription || "");
        }
      } else {
        toast.error("Failed to run bulk optimization");
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to run bulk optimization");
    } finally {
      setOptimizingPage(false);
    }
  };

  const filtered = pages
    .filter((p) => filter === "all" || p.type === filter)
    .filter((p) => !search || p.title?.toLowerCase().includes(search.toLowerCase()) || p.url.includes(search))
    .sort((a, b) => sort === "score_asc" ? a.overallScore - b.overallScore : sort === "score_desc" ? b.overallScore - a.overallScore : b.issueCount - a.issueCount);

  return (
    <div className="flex gap-6 min-h-[calc(100vh-8rem)] relative overflow-hidden">
      {/* Main Table section */}
      <div className={`flex-1 space-y-6 transition-all duration-300 ${selectedPage ? "pr-[400px] xl:pr-[450px]" : ""}`}>
        <div>
          <h2 className="text-2xl font-black text-white">Page SEO Analyzer</h2>
          <p className="text-slate-400 text-sm mt-1">Analyze individual pages and fix SEO problems in real-time</p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search pages..."
              className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#FFC300]/30"
            />
          </div>
          <div className="flex gap-2">
            {(["all", "page", "post", "project"] as const).map((f) => (
              <button key={f} onClick={() => setFilter(f)} className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${filter === f ? "bg-[#FFC300]/10 text-[#FFC300] border border-[#FFC300]/20" : "text-slate-400 hover:text-white border border-white/10 hover:border-white/20"}`}>
                {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1) + "s"}
              </button>
            ))}
          </div>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as typeof sort)}
            className="px-3 py-2 bg-[#1C1B1A] border border-white/10 rounded-xl text-xs text-slate-400 focus:outline-none focus:border-[#FFC300]/30"
          >
            <option value="score_asc">Worst Score First</option>
            <option value="score_desc">Best Score First</option>
            <option value="issues">Most Issues First</option>
          </select>
        </div>

        {/* Pages Table */}
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
                {loading ? (
                  <tr><td colSpan={5} className="text-center py-12 text-slate-500">Loading pages...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-12 text-slate-500">No pages found</td></tr>
                ) : (
                  filtered.map((page) => {
                    const scoreColor = getScoreColor(page.overallScore);
                    const isSelected = selectedPage?.id === page.id;
                    return (
                      <tr key={page.id} className={`border-b border-white/5 hover:bg-white/3 transition-colors ${isSelected ? "bg-white/5" : ""}`}>
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
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black text-white" style={{ background: `${scoreColor}20`, border: `2px solid ${scoreColor}` }}>
                              {Math.round(page.overallScore)}
                            </div>
                            <span className="text-xs text-slate-400">/100</span>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${page.issueCount > 5 ? "bg-red-500/10 text-red-400 border border-red-500/20" : page.issueCount > 0 ? "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20" : "bg-green-500/10 text-green-400 border border-green-500/20"}`}>
                            {page.issueCount} issues
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <button
                            onClick={() => handleOpenDiagnostics(page)}
                            className="text-xs font-bold text-[#FFC300] hover:text-white bg-[#FFC300]/10 hover:bg-[#FFC300]/20 border border-[#FFC300]/20 px-3 py-1.5 rounded-lg transition-all"
                          >
                            Diagnostics
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Sliding Diagnostics Sidebar */}
      {selectedPage && (
        <aside className="fixed top-16 right-0 bottom-0 w-[400px] xl:w-[450px] bg-[#181716] border-l border-white/5 z-40 flex flex-col justify-between shadow-2xl transition-transform duration-300">
          {/* Header */}
          <div className="p-5 border-b border-white/5 flex items-center justify-between">
            <div className="min-w-0">
              <span className="text-[10px] font-black text-[#FFC300] uppercase tracking-widest">{selectedPage.type} Diagnostics</span>
              <h3 className="text-base font-black text-white truncate mt-0.5">{selectedPage.title || "Untitled"}</h3>
            </div>
            <button onClick={() => setSelectedPage(null)} className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-5 space-y-6">
            {analyzing ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <RefreshCw className="w-8 h-8 text-[#FFC300] animate-spin" />
                <p className="text-sm text-slate-400 font-bold">Running SEO Scan...</p>
              </div>
            ) : (
              <>
                {/* Score Summary */}
                <div className="flex items-center gap-5 p-4 rounded-xl bg-white/3 border border-white/5">
                  <ScoreGauge score={analysis?.scores.overall ?? selectedPage.overallScore} size="sm" showLabel={false} />
                  <div>
                    <h4 className="font-black text-white text-lg">{Math.round(analysis?.scores.overall ?? selectedPage.overallScore)}/100</h4>
                    <p className="text-xs text-slate-400">Audit Health Score</p>
                    <p className="text-[10px] text-slate-500 mt-1 font-mono">{selectedPage.url}</p>
                  </div>
                </div>

                {/* Sub Scores */}
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

                {/* Metadata Editor & One-Click Fix */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black text-white uppercase tracking-wider">Metadata Optimizer</h4>
                    <button
                      onClick={handleAiGenerate}
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
                      onClick={handleSaveMeta}
                      disabled={savingMeta}
                      className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-[#FFC300] text-[#1C1B1A] font-black text-xs hover:bg-[#FFD60A] transition-all disabled:opacity-60"
                    >
                      <Save className="w-3.5 h-3.5" />
                      {savingMeta ? "Saving..." : "Apply & Save to DB"}
                    </button>
                  </div>

                  {/* One-Click Bulk Optimizer */}
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

                {/* Issues List */}
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
    </div>
  );
}
