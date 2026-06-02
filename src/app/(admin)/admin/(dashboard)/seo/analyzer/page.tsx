"use client";

import { useEffect, useState } from "react";
import { ScoreGauge } from "@/components/admin/seo/ScoreGauge";
import { IssueList } from "@/components/admin/seo/IssueList";
import { Search, RefreshCw, AlertCircle, CheckCircle2, ArrowUpRight, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { getScoreColor } from "@/lib/seo/scorer";

interface SeoPageData {
  id: string; type: string; url: string; title: string;
  metaTitle: string | null; metaDescription: string | null;
  overallScore: number; technicalScore: number; contentScore: number;
  entityScore: number; schemaScore: number; internalLinkScore: number; ctrScore: number;
  wordCount: number; hasFaq: boolean; hasSchema: boolean; isOrphan: boolean;
  lastAnalyzed: string | null; issueCount: number;
}

interface AnalysisResult {
  analysis: { metaTitle: string | null; metaDescription: string | null; h1: string | null; headings: Array<{ level: number; text: string }>; wordCount: number; readabilityScore: number; imagesCount: number; imagesWithAlt: number; hasFaq: boolean; keywordDensity: Record<string, number>; issues: Array<{ type: string; severity: string; description: string; suggestion: string }>; recommendations: string[] };
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
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${score}%`, background: color, boxShadow: `0 0 6px ${color}60` }} />
      </div>
    </div>
  );
}

function PageRow({ page, onAnalyze, analyzing }: { page: SeoPageData; onAnalyze: () => void; analyzing: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);

  const handleAnalyze = async () => {
    onAnalyze();
    const res = await fetch(`/api/seo/pages/${page.id}/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pageType: page.type }),
    });
    const data = await res.json();
    setAnalysis(data);
    setExpanded(true);
  };

  const scoreColor = getScoreColor(page.overallScore);

  return (
    <>
      <tr className="border-b border-white/5 hover:bg-white/3 transition-colors">
        <td className="px-4 py-4">
          <div>
            <p className="text-sm font-bold text-white truncate max-w-[200px]">{page.title || "Untitled"}</p>
            <a href={page.url} target="_blank" rel="noopener noreferrer" className="text-xs text-slate-500 hover:text-[#FFC300] transition-colors flex items-center gap-1 mt-0.5">
              {page.url} <ExternalLink className="w-2.5 h-2.5" />
            </a>
          </div>
        </td>
        <td className="px-4 py-4">
          <span className="text-xs font-bold px-2 py-1 rounded-full bg-white/5 text-slate-400 uppercase">{page.type}</span>
        </td>
        <td className="px-4 py-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black text-white" style={{ background: `${scoreColor}20`, border: `2px solid ${scoreColor}` }}>
              {Math.round(page.overallScore)}
            </div>
          </div>
        </td>
        <td className="px-4 py-4">
          {page.metaTitle ? (
            <span className="text-xs text-green-400 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> {page.metaTitle.length} chars</span>
          ) : (
            <span className="text-xs text-red-400 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" /> Missing</span>
          )}
        </td>
        <td className="px-4 py-4">
          {page.metaDescription ? (
            <span className="text-xs text-green-400 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> OK</span>
          ) : (
            <span className="text-xs text-red-400 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" /> Missing</span>
          )}
        </td>
        <td className="px-4 py-4">
          <span className={`text-xs font-bold px-2 py-1 rounded-full ${page.issueCount > 5 ? "bg-red-500/20 text-red-300" : page.issueCount > 0 ? "bg-yellow-500/20 text-yellow-300" : "bg-green-500/20 text-green-300"}`}>
            {page.issueCount} issues
          </span>
        </td>
        <td className="px-4 py-4 text-right">
          <div className="flex items-center gap-2 justify-end">
            <button
              onClick={handleAnalyze}
              disabled={analyzing}
              className="text-xs font-bold text-[#FFC300] hover:text-white bg-[#FFC300]/10 hover:bg-[#FFC300]/20 border border-[#FFC300]/20 px-3 py-1.5 rounded-lg transition-all disabled:opacity-50"
            >
              {analyzing ? <RefreshCw className="w-3 h-3 animate-spin" /> : "Analyze"}
            </button>
            {analysis && (
              <button onClick={() => setExpanded(!expanded)} className="text-slate-400 hover:text-white transition-colors">
                {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            )}
          </div>
        </td>
      </tr>
      {expanded && analysis && (
        <tr className="border-b border-white/5">
          <td colSpan={7} className="px-4 pb-6">
            <div className="mt-2 p-6 rounded-2xl bg-white/3 border border-white/10 grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Scores */}
              <div className="space-y-3">
                <h4 className="text-sm font-black text-white mb-3">Dimension Scores</h4>
                <ScoreBar label="Technical" score={analysis.scores.technical} color="#3b82f6" />
                <ScoreBar label="Content" score={analysis.scores.content} color="#8b5cf6" />
                <ScoreBar label="Entities" score={analysis.scores.entity} color="#06b6d4" />
                <ScoreBar label="Internal Links" score={analysis.scores.internalLink} color="#10b981" />
                <ScoreBar label="Schema" score={analysis.scores.schema} color="#f59e0b" />
                <ScoreBar label="CTR" score={analysis.scores.ctr} color="#ec4899" />
                <div className="pt-2 border-t border-white/10">
                  <div className="flex items-center gap-3">
                    <ScoreGauge score={analysis.scores.overall} size="sm" showLabel={false} />
                    <div>
                      <p className="text-lg font-black text-white">{Math.round(analysis.scores.overall)}/100</p>
                      <p className="text-xs text-slate-400">Overall Score</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Issues */}
              <div>
                <h4 className="text-sm font-black text-white mb-3">Issues ({analysis.analysis.issues.length})</h4>
                <IssueList issues={analysis.analysis.issues.map((i) => ({ ...i, severity: i.severity as "critical" | "important" | "recommended" }))} maxItems={5} />
              </div>

              {/* AI Recommendations */}
              <div>
                <h4 className="text-sm font-black text-white mb-3">AI Recommendations</h4>
                <div className="space-y-2">
                  {analysis.recommendations.slice(0, 4).map((rec, i) => (
                    <div key={i} className="p-3 rounded-xl bg-[#FFC300]/5 border border-[#FFC300]/10">
                      <p className="text-xs font-black text-[#FFC300] mb-1">{rec.title}</p>
                      <p className="text-xs text-slate-400 line-clamp-3 whitespace-pre-line">{rec.content}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export default function PageAnalyzerPage() {
  const [pages, setPages] = useState<SeoPageData[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "page" | "post" | "project">("all");
  const [sort, setSort] = useState<"score_asc" | "score_desc" | "issues">("score_asc");
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/seo/pages")
      .then((r) => r.json())
      .then((d) => setPages(d.pages || []))
      .finally(() => setLoading(false));
  }, []);

  const filtered = pages
    .filter((p) => filter === "all" || p.type === filter)
    .filter((p) => !search || p.title?.toLowerCase().includes(search.toLowerCase()) || p.url.includes(search))
    .sort((a, b) => sort === "score_asc" ? a.overallScore - b.overallScore : sort === "score_desc" ? b.overallScore - a.overallScore : b.issueCount - a.issueCount);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black text-white">Page SEO Analyzer</h2>
        <p className="text-slate-400 text-sm mt-1">Analyze every page for SEO issues and get actionable recommendations</p>
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
          className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-slate-400 focus:outline-none focus:border-[#FFC300]/30"
        >
          <option value="score_asc">Worst Score First</option>
          <option value="score_desc">Best Score First</option>
          <option value="issues">Most Issues First</option>
        </select>
      </div>

      {/* Table */}
      <div className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                {["Page", "Type", "Score", "Meta Title", "Meta Desc", "Issues", "Action"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-black text-slate-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="text-center py-12 text-slate-500">Loading pages...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12 text-slate-500">No pages found</td></tr>
              ) : (
                filtered.map((page) => (
                  <PageRow
                    key={page.id}
                    page={page}
                    onAnalyze={() => setAnalyzingId(page.id)}
                    analyzing={analyzingId === page.id}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-slate-500 text-center">Showing {filtered.length} of {pages.length} pages · Click &ldquo;Analyze&rdquo; to run deep analysis on any page</p>
    </div>
  );
}
