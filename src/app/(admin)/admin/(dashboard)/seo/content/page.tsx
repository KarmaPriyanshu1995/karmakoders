"use client";

import { useEffect, useState } from "react";
import { ScoreGauge } from "@/components/admin/seo/ScoreGauge";
import { IssueList } from "@/components/admin/seo/IssueList";
import { FileText, RefreshCw, Search, ChevronDown, ChevronUp, Lightbulb } from "lucide-react";
import { getScoreColor } from "@/lib/seo/scorer";

interface ContentPage {
  id: string; type: string; url: string; title: string;
  wordCount: number; readabilityScore: number; hasFaq: boolean;
  contentScore: number; overallScore: number;
  issues: Array<{ type: string; severity: string; description: string; suggestion: string }>;
  recommendations: Array<{ type: string; title: string; content: string; priority: string }>;
}

const TOPIC_SUGGESTIONS = [
  "Web Development Best Practices",
  "React vs Next.js: Which to Choose?",
  "How to Build a SaaS Application",
  "Mobile App Development Cost Guide",
  "SEO for Web Development Companies",
  "Laravel vs Node.js Performance Comparison",
  "UI/UX Design Principles for 2025",
  "API Design and REST vs GraphQL",
];

export default function ContentIntelligencePage() {
  const [pages, setPages] = useState<ContentPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/seo/pages")
      .then((r) => r.json())
      .then((d) => {
        const pagesData = (d.pages || []).map((p: {
          id: string; type: string; url: string; title: string;
          wordCount: number; readabilityScore?: number; hasFaq: boolean;
          contentScore: number; overallScore: number; issueCount: number;
        }) => ({
          ...p,
          readabilityScore: p.readabilityScore ?? 0,
          issues: [],
          recommendations: [],
        }));
        setPages(pagesData);
      })
      .finally(() => setLoading(false));
  }, []);

  const analyzeContent = async (page: ContentPage) => {
    setAnalyzing(page.id);
    const res = await fetch(`/api/seo/pages/${page.id}/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pageType: page.type }),
    });
    const data = await res.json();
    setPages((prev) => prev.map((p) => p.id === page.id ? {
      ...p,
      wordCount: data.analysis?.wordCount ?? p.wordCount,
      readabilityScore: data.analysis?.readabilityScore ?? p.readabilityScore,
      hasFaq: data.analysis?.hasFaq ?? p.hasFaq,
      contentScore: data.scores?.content ?? p.contentScore,
      issues: data.analysis?.issues ?? [],
      recommendations: data.recommendations ?? [],
    } : p));
    setExpanded(page.id);
    setAnalyzing(null);
  };

  const avgContentScore = pages.length ? Math.round(pages.reduce((s, p) => s + p.contentScore, 0) / pages.length) : 0;
  const lowContent = pages.filter((p) => p.wordCount < 600).length;
  const missingFaq = pages.filter((p) => !p.hasFaq).length;

  const filtered = pages.filter((p) => !search || p.title?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black text-white">Content Intelligence</h2>
        <p className="text-slate-400 text-sm mt-1">Analyze content depth, semantic coverage, and E-E-A-T signals</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-6 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-5">
          <ScoreGauge score={avgContentScore} size="sm" showLabel={false} />
          <div>
            <p className="text-2xl font-black text-white">{avgContentScore}</p>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Avg Content Score</p>
          </div>
        </div>
        <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
          <p className="text-3xl font-black text-orange-400">{lowContent}</p>
          <p className="text-xs text-slate-400 font-bold mt-1">Pages with Thin Content</p>
          <p className="text-xs text-slate-500 mt-0.5">Under 600 words</p>
        </div>
        <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
          <p className="text-3xl font-black text-blue-400">{missingFaq}</p>
          <p className="text-xs text-slate-400 font-bold mt-1">Pages Missing FAQ</p>
          <p className="text-xs text-slate-500 mt-0.5">FAQ improves long-tail ranking</p>
        </div>
      </div>

      {/* Content suggestions */}
      <div className="p-6 rounded-2xl bg-[#FFC300]/5 border border-[#FFC300]/10">
        <div className="flex items-center gap-2 mb-4">
          <Lightbulb className="w-5 h-5 text-[#FFC300]" />
          <h3 className="font-black text-white">AI Content Suggestions</h3>
        </div>
        <p className="text-xs text-slate-400 mb-3">High-opportunity topics to create for your niche:</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {TOPIC_SUGGESTIONS.map((topic, i) => (
            <div key={i} className="flex items-center gap-2 p-3 rounded-xl bg-white/5 border border-white/5">
              <span className="w-5 h-5 rounded-full bg-[#FFC300]/10 text-[#FFC300] text-xs font-black flex items-center justify-center flex-shrink-0">{i + 1}</span>
              <span className="text-sm text-slate-300">{topic}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search pages..." className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#FFC300]/30" />
      </div>

      {/* Pages list */}
      <div className="space-y-2">
        {loading ? (
          <div className="text-center py-12 text-slate-500">Loading content data...</div>
        ) : (
          filtered.map((page) => {
            const color = getScoreColor(page.contentScore);
            const isExpanded = expanded === page.id;
            return (
              <div key={page.id} className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
                <div className="flex items-center gap-4 p-4">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-black text-white flex-shrink-0" style={{ background: `${color}20`, border: `2px solid ${color}` }}>
                    {Math.round(page.contentScore)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white truncate">{page.title}</p>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs text-slate-500">{page.wordCount} words</span>
                      <span className={`text-xs font-bold ${page.hasFaq ? "text-green-400" : "text-red-400"}`}>{page.hasFaq ? "✓ Has FAQ" : "✗ No FAQ"}</span>
                      <span className="text-xs text-slate-500">Readability: {Math.round(page.readabilityScore)}/100</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => analyzeContent(page)} disabled={analyzing === page.id} className="text-xs font-bold text-[#FFC300] hover:text-white bg-[#FFC300]/10 hover:bg-[#FFC300]/20 border border-[#FFC300]/20 px-3 py-1.5 rounded-lg transition-all disabled:opacity-50">
                      {analyzing === page.id ? <RefreshCw className="w-3 h-3 animate-spin" /> : "Analyze"}
                    </button>
                    {page.issues.length > 0 && (
                      <button onClick={() => setExpanded(isExpanded ? null : page.id)} className="text-slate-400 hover:text-white transition-colors">
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    )}
                  </div>
                </div>
                {isExpanded && page.issues.length > 0 && (
                  <div className="border-t border-white/10 p-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-xs font-black text-white uppercase tracking-wider mb-3">Content Issues</h4>
                      <IssueList issues={page.issues.filter((i) => ["thin_content", "low_word_count", "missing_faq", "low_readability", "poor_heading_structure"].includes(i.type)).map((i) => ({ ...i, severity: i.severity as "critical" | "important" | "recommended" }))} maxItems={5} />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-white uppercase tracking-wider mb-3">Improvement Plan</h4>
                      <div className="space-y-2">
                        {page.recommendations.filter((r) => r.type === "content").map((rec, i) => (
                          <div key={i} className="p-3 rounded-xl bg-[#FFC300]/5 border border-[#FFC300]/10">
                            <p className="text-xs font-black text-[#FFC300] mb-1">{rec.title}</p>
                            <p className="text-xs text-slate-400 whitespace-pre-line">{rec.content}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
