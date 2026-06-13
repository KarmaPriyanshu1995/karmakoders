"use client";

import { useState } from "react";
import { PieChart, Plus, TrendingUp, FileText, Hash, HelpCircle, Building2, BookOpen } from "lucide-react";

type GapType = "topic" | "keyword" | "faq" | "entity" | "service" | "subtopic";

const CONTENT_GAPS: Array<{ type: GapType; gap: string; description: string; priority: "high" | "medium" | "low"; cluster: string }> = [
  { type: "topic", gap: "Progressive Web Apps (PWA) Development", description: "Competitors rank for this — you have no content", priority: "high", cluster: "Web Development" },
  { type: "topic", gap: "DevOps and CI/CD Integration", description: "Growing search demand, no coverage", priority: "high", cluster: "Web Development" },
  { type: "keyword", gap: "hire react developer india", description: "High commercial intent, 820 monthly searches", priority: "high", cluster: "Web Development" },
  { type: "keyword", gap: "software development cost estimate", description: "High-value decision keyword, 1,200 monthly searches", priority: "high", cluster: "General" },
  { type: "faq", gap: "How long does it take to build a website?", description: "Common question with no FAQ answer on your site", priority: "medium", cluster: "General" },
  { type: "faq", gap: "What is the difference between React and Next.js?", description: "High educational intent, drives developer traffic", priority: "medium", cluster: "Web Development" },
  { type: "entity", gap: "TypeScript", description: "Core technology entity missing from site content", priority: "medium", cluster: "Web Development" },
  { type: "entity", gap: "Vercel", description: "Deployment platform — mention for semantic relevance", priority: "low", cluster: "Web Development" },
  { type: "service", gap: "E-commerce Development", description: "High demand service not mentioned on site", priority: "high", cluster: "Services" },
  { type: "service", gap: "SaaS Product Development", description: "Growing market segment with no coverage", priority: "high", cluster: "Services" },
  { type: "subtopic", gap: "Code Review and Quality Assurance", description: "Supporting topic missing from dev service pages", priority: "low", cluster: "Web Development" },
  { type: "subtopic", gap: "Website Maintenance and Support", description: "Common client need not addressed in content", priority: "medium", cluster: "Services" },
];

const GAP_CONFIG: Record<GapType, { icon: React.ElementType; color: string; label: string }> = {
  topic: { icon: BookOpen, color: "#8b5cf6", label: "Topic" },
  keyword: { icon: Hash, color: "#FFC300", label: "Keyword" },
  faq: { icon: HelpCircle, color: "#3b82f6", label: "FAQ" },
  entity: { icon: Building2, color: "#06b6d4", label: "Entity" },
  service: { icon: TrendingUp, color: "#10b981", label: "Service" },
  subtopic: { icon: FileText, color: "#f97316", label: "Subtopic" },
};

const PRIORITY_CONFIG = {
  high: { color: "#ef4444", bg: "bg-red-500/20", text: "text-red-300" },
  medium: { color: "#FFC300", bg: "bg-yellow-500/20", text: "text-yellow-300" },
  low: { color: "#64748b", bg: "bg-slate-500/20", text: "text-slate-400" },
};

export default function ContentGapPage() {
  const [filter, setFilter] = useState<"all" | GapType>("all");
  const [priority, setPriority] = useState<"all" | "high" | "medium" | "low">("all");

  const filtered = CONTENT_GAPS
    .filter((g) => filter === "all" || g.type === filter)
    .filter((g) => priority === "all" || g.priority === priority);

  const byType = Object.keys(GAP_CONFIG).map((type) => ({
    type, count: CONTENT_GAPS.filter((g) => g.type === type).length,
    ...GAP_CONFIG[type as GapType],
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-black text-white">Content Gap Analyzer</h2>
          <p className="text-slate-400 text-sm mt-1">Discover missing topics, keywords, and content opportunities</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#FFC300] text-[#1C1B1A] font-black text-sm hover:bg-[#FFD60A] transition-all">
          <Plus className="w-4 h-4" /> Add Gap
        </button>
      </div>

      {/* Gap type overview */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
        {byType.map((type) => {
          const Icon = type.icon;
          const IconComp = Icon as React.FC<{ className?: string; style?: React.CSSProperties }>;
          return (
            <button key={type.type} onClick={() => setFilter(filter === type.type as GapType ? "all" : type.type as GapType)} className={`p-4 rounded-2xl border text-center transition-all hover:-translate-y-0.5 ${filter === type.type ? "text-white" : "bg-white/5 border-white/10 hover:border-white/20"}`} style={filter === type.type ? { background: `${type.color}15`, borderColor: `${type.color}30` } : {}}>
              <IconComp className="w-5 h-5 mx-auto mb-1.5" style={{ color: type.color }} />
              <p className="text-xl font-black text-white">{type.count}</p>
              <p className="text-xs text-slate-400">{type.label}</p>
            </button>
          );
        })}
      </div>

      {/* Priority filter */}
      <div className="flex gap-2 flex-wrap">
        {(["all", "high", "medium", "low"] as const).map((p) => {
          const cfg = p === "all" ? null : PRIORITY_CONFIG[p];
          return (
            <button key={p} onClick={() => setPriority(p)} className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${priority === p ? (cfg ? `${cfg.bg} ${cfg.text} border-current` : "bg-[#FFC300]/10 text-[#FFC300] border-[#FFC300]/20") : "text-slate-400 border-white/10 hover:text-white"}`}>
              {p.charAt(0).toUpperCase() + p.slice(1)} Priority {p !== "all" && `(${CONTENT_GAPS.filter((g) => g.priority === p).length})`}
            </button>
          );
        })}
      </div>

      {/* Gap list */}
      <div className="space-y-3">
        {filtered.map((gap, i) => {
          const typeCfg = GAP_CONFIG[gap.type];
          const priCfg = PRIORITY_CONFIG[gap.priority];
          const Icon = typeCfg.icon;
          const IconComp = Icon as React.FC<{ className?: string; style?: React.CSSProperties }>;
          return (
            <div key={i} className="flex items-start gap-4 p-5 rounded-2xl bg-white/5 border border-white/10 hover:border-white/20 transition-all">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${typeCfg.color}15`, border: `1px solid ${typeCfg.color}25` }}>
                <IconComp className="w-4 h-4" style={{ color: typeCfg.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full border" style={{ background: `${typeCfg.color}15`, borderColor: `${typeCfg.color}25`, color: typeCfg.color }}>{typeCfg.label}</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${priCfg.bg} ${priCfg.text}`}>{gap.priority} priority</span>
                  <span className="text-xs text-slate-600">• {gap.cluster}</span>
                </div>
                <p className="text-sm font-black text-white">{gap.gap}</p>
                <p className="text-xs text-slate-400 mt-0.5">{gap.description}</p>
              </div>
              <button className="text-xs font-bold text-[#FFC300] hover:text-white bg-[#FFC300]/10 hover:bg-[#FFC300]/20 border border-[#FFC300]/20 px-3 py-1.5 rounded-lg transition-all flex-shrink-0">
                Create →
              </button>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-slate-500 text-center">Showing {filtered.length} of {CONTENT_GAPS.length} content gaps</p>
    </div>
  );
}
