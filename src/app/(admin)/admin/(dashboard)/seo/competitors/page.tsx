"use client";

import { useState } from "react";
import { Users, Plus, Trash2, TrendingUp, CheckCircle2, AlertCircle, ExternalLink } from "lucide-react";

interface Competitor {
  id: string;
  name: string;
  url: string;
  schemaTypes: string[];
  estimatedKeywords: number;
  topicCoverage: string[];
  contentGaps: string[];
  strengths: string[];
}

const DEFAULT_COMPETITORS: Competitor[] = [
  {
    id: "1",
    name: "WebFX",
    url: "https://webfx.com",
    schemaTypes: ["Organization", "Service", "FAQ", "Review", "LocalBusiness"],
    estimatedKeywords: 12500,
    topicCoverage: ["Web Development", "SEO", "Digital Marketing", "E-commerce", "PPC"],
    contentGaps: ["Mobile App Development", "SaaS Development"],
    strengths: ["Deep FAQ content", "Strong review schema", "Massive topical coverage"],
  },
  {
    id: "2",
    name: "Toptal",
    url: "https://toptal.com",
    schemaTypes: ["Organization", "Service", "Article", "FAQ"],
    estimatedKeywords: 8200,
    topicCoverage: ["Freelance Development", "React", "Node.js", "Python", "Design"],
    contentGaps: ["Local Business SEO", "Mobile App"],
    strengths: ["Strong developer-focused content", "Excellent E-E-A-T", "Case studies"],
  },
];

export default function CompetitorIntelligencePage() {
  const [competitors, setCompetitors] = useState(DEFAULT_COMPETITORS);
  const [showAdd, setShowAdd] = useState(false);
  const [newComp, setNewComp] = useState({ name: "", url: "" });
  const [selected, setSelected] = useState<Competitor | null>(competitors[0]);

  const addCompetitor = () => {
    if (!newComp.name || !newComp.url) return;
    const comp: Competitor = {
      id: Date.now().toString(),
      name: newComp.name,
      url: newComp.url,
      schemaTypes: ["Organization"],
      estimatedKeywords: 0,
      topicCoverage: [],
      contentGaps: [],
      strengths: [],
    };
    setCompetitors((p) => [...p, comp]);
    setNewComp({ name: "", url: "" });
    setShowAdd(false);
  };

  const removeCompetitor = (id: string) => {
    setCompetitors((p) => p.filter((c) => c.id !== id));
    if (selected?.id === id) setSelected(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-black text-white">Competitor Intelligence</h2>
          <p className="text-slate-400 text-sm mt-1">Track competitors and find opportunities to outrank them</p>
        </div>
        <button onClick={() => setShowAdd(!showAdd)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#FFC300] text-[#1C1B1A] font-black text-sm hover:bg-[#FFD60A] transition-all">
          <Plus className="w-4 h-4" /> Add Competitor
        </button>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="p-5 rounded-2xl bg-white/5 border border-[#FFC300]/20 flex gap-3 flex-wrap">
          <input value={newComp.name} onChange={(e) => setNewComp((p) => ({ ...p, name: e.target.value }))} placeholder="Competitor name" className="flex-1 min-w-48 px-3 py-2.5 bg-[#1C1B1A] border border-white/10 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:border-[#FFC300]/30" />
          <input value={newComp.url} onChange={(e) => setNewComp((p) => ({ ...p, url: e.target.value }))} placeholder="https://competitor.com" className="flex-1 min-w-48 px-3 py-2.5 bg-[#1C1B1A] border border-white/10 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:border-[#FFC300]/30" />
          <button onClick={addCompetitor} className="px-4 py-2.5 rounded-xl bg-[#FFC300] text-[#1C1B1A] font-black text-sm">Add</button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Competitor list */}
        <div className="space-y-3">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">Tracked Competitors</h3>
          {competitors.map((comp) => (
            <div
              key={comp.id}
              onClick={() => setSelected(comp)}
              className={`p-4 rounded-2xl border cursor-pointer transition-all group ${selected?.id === comp.id ? "bg-[#FFC300]/10 border-[#FFC300]/20" : "bg-white/5 border-white/10 hover:border-white/20"}`}
            >
              <div className="flex items-center justify-between mb-2">
                <p className="font-black text-white text-sm">{comp.name}</p>
                <div className="flex items-center gap-2">
                  <a href={comp.url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-slate-500 hover:text-[#FFC300] transition-colors">
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  <button onClick={(e) => { e.stopPropagation(); removeCompetitor(comp.id); }} className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-all">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <p className="text-xs text-slate-500 font-mono truncate">{comp.url}</p>
              <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
                <span>~{comp.estimatedKeywords.toLocaleString()} keywords</span>
                <span>{comp.schemaTypes.length} schema types</span>
              </div>
            </div>
          ))}
        </div>

        {/* Competitor analysis */}
        {selected ? (
          <div className="lg:col-span-2 space-y-5">
            <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-[#FFC300]/10 border border-[#FFC300]/20 flex items-center justify-center">
                  <Users className="w-5 h-5 text-[#FFC300]" />
                </div>
                <div>
                  <h3 className="font-black text-white">{selected.name}</h3>
                  <a href={selected.url} target="_blank" rel="noopener noreferrer" className="text-xs text-[#FFC300] hover:text-white flex items-center gap-1">{selected.url} <ExternalLink className="w-3 h-3" /></a>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 mb-5">
                {[
                  { label: "Est. Keywords", value: selected.estimatedKeywords.toLocaleString(), color: "#FFC300" },
                  { label: "Schema Types", value: selected.schemaTypes.length, color: "#8b5cf6" },
                  { label: "Topics Covered", value: selected.topicCoverage.length, color: "#10b981" },
                ].map((stat) => (
                  <div key={stat.label} className="p-3 rounded-xl bg-white/5 text-center">
                    <p className="text-xl font-black" style={{ color: stat.color }}>{stat.value}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{stat.label}</p>
                  </div>
                ))}
              </div>

              {/* Schema comparison */}
              <div className="mb-5">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-3">Schema Types They Use</h4>
                <div className="flex flex-wrap gap-2">
                  {selected.schemaTypes.map((s) => (
                    <span key={s} className="text-xs font-bold px-2 py-1 rounded-full bg-[#FFC300]/10 text-[#FFC300] border border-[#FFC300]/20">{s}</span>
                  ))}
                </div>
              </div>

              {/* Topics */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-3">Their Topic Coverage</h4>
                  {selected.topicCoverage.map((t) => (
                    <div key={t} className="flex items-center gap-2 text-xs text-slate-300 mb-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-400 flex-shrink-0" /> {t}
                    </div>
                  ))}
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-3">Their Gaps (Your Opportunities)</h4>
                  {selected.contentGaps.map((g) => (
                    <div key={g} className="flex items-center gap-2 text-xs text-slate-300 mb-1.5">
                      <AlertCircle className="w-3.5 h-3.5 text-[#FFC300] flex-shrink-0" /> {g}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Competitor strengths */}
            <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-4 h-4 text-purple-400" />
                <h4 className="font-black text-white">What They Do Well (Learn From)</h4>
              </div>
              {selected.strengths.map((s, i) => (
                <div key={i} className="flex items-start gap-2 mb-2 p-3 rounded-xl bg-purple-500/5 border border-purple-500/10">
                  <span className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-400 text-xs font-black flex items-center justify-center flex-shrink-0">{i + 1}</span>
                  <span className="text-sm text-slate-300">{s}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="lg:col-span-2 flex items-center justify-center rounded-2xl bg-white/3 border border-white/10">
            <div className="text-center py-16">
              <Users className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <p className="text-white font-bold">Select a competitor to view analysis</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
