"use client";

import { useEffect, useState } from "react";
import { Bot, Zap, RefreshCw, Copy, Check, ChevronDown, ChevronUp, FileText, Code2, HelpCircle, Link2, TrendingUp } from "lucide-react";
import { generateMetaTitle, generateMetaDescription, generateFaqQuestions, generateContentImprovements, generateEEATImprovements } from "@/lib/seo/aiRecommender";

interface PageOption {
  id: string; type: string; url: string; title: string;
  metaTitle: string | null; metaDescription: string | null;
  wordCount: number; hasFaq: boolean; hasSchema: boolean;
}

interface Recommendations {
  title?: string;
  description?: string;
  faqs?: Array<{ question: string; answer: string }>;
  improvements?: string[];
  eeat?: string[];
}

export default function AiAssistantPage() {
  const [pages, setPages] = useState<PageOption[]>([]);
  const [selectedPage, setSelectedPage] = useState<PageOption | null>(null);
  const [recs, setRecs] = useState<Recommendations>({});
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [expanded, setExpanded] = useState<string[]>(["title"]);
  const [copied, setCopied] = useState<Record<string, boolean>>({});
  const [loadingPages, setLoadingPages] = useState(true);

  useEffect(() => {
    fetch("/api/seo/pages")
      .then((r) => r.json())
      .then((d) => setPages(d.pages || []))
      .finally(() => setLoadingPages(false));
  }, []);

  const toggleExpand = (key: string) => setExpanded((p) => p.includes(key) ? p.filter((k) => k !== key) : [...p, key]);
  const isExpanded = (key: string) => expanded.includes(key);

  const handleCopy = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopied((p) => ({ ...p, [key]: true }));
    setTimeout(() => setCopied((p) => ({ ...p, [key]: false })), 2000);
  };

  const generateAll = async () => {
    if (!selectedPage) return;
    setGenerating(true);
    await new Promise((r) => setTimeout(r, 800));
    const ctx = {
      title: selectedPage.title,
      url: selectedPage.url,
      metaTitle: selectedPage.metaTitle,
      metaDescription: selectedPage.metaDescription,
      wordCount: selectedPage.wordCount,
      hasFaq: selectedPage.hasFaq,
      hasSchema: selectedPage.hasSchema,
    };
    setRecs({
      title: generateMetaTitle(ctx),
      description: generateMetaDescription(ctx),
      faqs: generateFaqQuestions(ctx),
      improvements: generateContentImprovements(ctx),
      eeat: generateEEATImprovements(ctx),
    });
    setExpanded(["title", "description", "faqs", "improvements", "eeat"]);
    setGenerating(false);
  };

  const RecommendationBlock = ({ id, icon: Icon, label, children, color = "#FFC300" }: { id: string; icon: React.ElementType; label: string; children: React.ReactNode; color?: string }) => {
    const IconComp = Icon as React.FC<{ className?: string; style?: React.CSSProperties }>;
    return (
    <div className="rounded-2xl border border-white/10 overflow-hidden">
      <button onClick={() => toggleExpand(id)} className="w-full flex items-center justify-between p-4 hover:bg-white/3 transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${color}15`, border: `1px solid ${color}25` }}>
            <IconComp className="w-4 h-4" style={{ color }} />
          </div>
          <span className="font-black text-white text-sm">{label}</span>
        </div>
        {isExpanded(id) ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </button>
      {isExpanded(id) && <div className="border-t border-white/10 p-4">{children}</div>}
    </div>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black text-white">AI SEO Assistant</h2>
        <p className="text-slate-400 text-sm mt-1">Rule-based AI recommendations for titles, descriptions, FAQs, content improvements, and E-E-A-T</p>
      </div>

      {/* Page selector */}
      <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
        <label className="text-xs font-black text-slate-400 uppercase tracking-wider mb-2 block">Select a Page to Optimize</label>
        <div className="flex gap-3 flex-wrap">
          <select
            value={selectedPage?.id || ""}
            onChange={(e) => {
              const page = pages.find((p) => p.id === e.target.value) || null;
              setSelectedPage(page);
              setRecs({});
            }}
            className="flex-1 min-w-48 px-3 py-2.5 bg-[#1C1B1A] border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-[#FFC300]/30"
            disabled={loadingPages}
          >
            <option value="">— Select a page —</option>
            {pages.map((p) => (
              <option key={p.id} value={p.id}>{p.type.toUpperCase()} · {p.title || p.url}</option>
            ))}
          </select>
          <button
            onClick={generateAll}
            disabled={!selectedPage || generating}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#FFC300] text-[#1C1B1A] font-black text-sm hover:bg-[#FFD60A] transition-all disabled:opacity-50 shadow-[0_0_15px_rgba(255,195,0,0.3)]"
          >
            <Zap className={`w-4 h-4 ${generating ? "animate-pulse" : ""}`} />
            {generating ? "Generating..." : "Optimize Entire Page"}
          </button>
        </div>

        {selectedPage && (
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            {[
              { label: "Word Count", value: selectedPage.wordCount || "—" },
              { label: "Has FAQ", value: selectedPage.hasFaq ? "✓ Yes" : "✗ No" },
              { label: "Has Schema", value: selectedPage.hasSchema ? "✓ Yes" : "✗ No" },
              { label: "URL", value: selectedPage.url },
            ].map((item) => (
              <div key={item.label} className="p-3 rounded-xl bg-white/5">
                <p className="text-slate-500 mb-1">{item.label}</p>
                <p className="font-bold text-white truncate">{item.value}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recommendations */}
      {Object.keys(recs).length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-[#FFC300]" />
            <h3 className="font-black text-white">AI-Generated Recommendations</h3>
          </div>

          {recs.title && (
            <RecommendationBlock id="title" icon={FileText} label="Optimized Meta Title" color="#FFC300">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm text-white bg-white/5 border border-white/10 rounded-xl p-3 flex-1">{recs.title}</p>
                <button onClick={() => handleCopy("title", recs.title!)} className="flex items-center gap-1 text-xs text-slate-400 hover:text-[#FFC300] transition-colors px-3 py-2 rounded-lg hover:bg-[#FFC300]/10 flex-shrink-0">
                  {copied.title ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-2">{recs.title.length} chars · Optimal range: 50-60</p>
            </RecommendationBlock>
          )}

          {recs.description && (
            <RecommendationBlock id="description" icon={FileText} label="Optimized Meta Description" color="#8b5cf6">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm text-white bg-white/5 border border-white/10 rounded-xl p-3 flex-1">{recs.description}</p>
                <button onClick={() => handleCopy("description", recs.description!)} className="flex items-center gap-1 text-xs text-slate-400 hover:text-[#FFC300] transition-colors px-3 py-2 rounded-lg hover:bg-[#FFC300]/10 flex-shrink-0">
                  {copied.description ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-2">{recs.description.length} chars · Optimal range: 140-160</p>
            </RecommendationBlock>
          )}

          {recs.faqs && recs.faqs.length > 0 && (
            <RecommendationBlock id="faqs" icon={HelpCircle} label={`Generated FAQs (${recs.faqs.length} questions)`} color="#3b82f6">
              <div className="space-y-3">
                {recs.faqs.map((faq, i) => (
                  <div key={i} className="p-3 rounded-xl bg-white/5 border border-white/5">
                    <p className="text-xs font-black text-[#FFC300] mb-1">Q: {faq.question}</p>
                    <p className="text-xs text-slate-300">A: {faq.answer}</p>
                  </div>
                ))}
              </div>
            </RecommendationBlock>
          )}

          {recs.improvements && (
            <RecommendationBlock id="improvements" icon={TrendingUp} label="Content Improvement Plan" color="#10b981">
              <ol className="space-y-2">
                {recs.improvements.map((imp, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-slate-300">
                    <span className="w-5 h-5 rounded-full bg-green-500/20 text-green-400 text-xs font-black flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                    {imp}
                  </li>
                ))}
              </ol>
            </RecommendationBlock>
          )}

          {recs.eeat && (
            <RecommendationBlock id="eeat" icon={Code2} label="E-E-A-T Improvement Checklist" color="#ec4899">
              <ol className="space-y-2">
                {recs.eeat.map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-slate-300">
                    <span className="w-5 h-5 rounded-full bg-pink-500/20 text-pink-400 text-xs font-black flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                    {item}
                  </li>
                ))}
              </ol>
            </RecommendationBlock>
          )}
        </div>
      )}

      {!selectedPage && (
        <div className="flex flex-col items-center justify-center py-24 text-center rounded-2xl bg-white/3 border border-white/10">
          <Bot className="w-16 h-16 text-slate-600 mb-4" />
          <p className="text-xl font-black text-white">AI SEO Assistant Ready</p>
          <p className="text-slate-500 mt-2">Select a page above and click &ldquo;Optimize Entire Page&rdquo; to generate comprehensive recommendations</p>
        </div>
      )}
    </div>
  );
}
