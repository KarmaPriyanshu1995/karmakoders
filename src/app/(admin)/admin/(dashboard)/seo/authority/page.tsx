"use client";

import { useState } from "react";
import { ScoreGauge } from "@/components/admin/seo/ScoreGauge";
import { Map, ChevronRight, Plus, TrendingUp, FileText, AlertTriangle } from "lucide-react";

const PRESET_CLUSTERS = [
  {
    name: "Web Development",
    slug: "web-development",
    healthScore: 72,
    authorityScore: 68,
    pillar: "Complete Web Development Guide",
    children: ["Laravel Development", "React Development", "Node.js Development", "API Development"],
    missing: ["Vue.js Guide", "Django Tutorial", "Full Stack Development"],
    keywords: "web development, full stack, custom software",
  },
  {
    name: "SEO Services",
    slug: "seo",
    healthScore: 45,
    authorityScore: 40,
    pillar: "Complete SEO Guide for Businesses",
    children: ["Technical SEO", "On-Page SEO"],
    missing: ["Local SEO Guide", "E-commerce SEO", "SEO Audit Guide", "Link Building"],
    keywords: "SEO services, search engine optimization, technical SEO",
  },
  {
    name: "Mobile Development",
    slug: "mobile",
    healthScore: 55,
    authorityScore: 50,
    pillar: "Mobile App Development Guide",
    children: ["React Native Development", "Flutter Development"],
    missing: ["iOS App Development", "Android Development", "Progressive Web Apps"],
    keywords: "mobile app development, react native, flutter",
  },
  {
    name: "UI/UX Design",
    slug: "ui-ux",
    healthScore: 30,
    authorityScore: 25,
    pillar: "UI/UX Design Best Practices",
    children: [],
    missing: ["User Research Guide", "Wireframing Tutorial", "Design Systems", "Figma Guide"],
    keywords: "UI design, UX design, user interface, user experience",
  },
];

function getHealthColor(score: number) {
  if (score >= 70) return "#22c55e";
  if (score >= 50) return "#FFC300";
  if (score >= 30) return "#f97316";
  return "#ef4444";
}

function ClusterCard({ cluster }: { cluster: typeof PRESET_CLUSTERS[0] }) {
  const [expanded, setExpanded] = useState(false);
  const color = getHealthColor(cluster.healthScore);

  return (
    <div className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
      <div className="p-5 flex items-start gap-4">
        <ScoreGauge score={cluster.healthScore} size="sm" showLabel={false} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
            <h3 className="font-black text-white">{cluster.name}</h3>
            <span className="text-xs font-bold px-2 py-1 rounded-full" style={{ background: `${color}20`, color }}>
              {cluster.healthScore >= 70 ? "Healthy" : cluster.healthScore >= 50 ? "Needs Work" : "Weak"}
            </span>
          </div>
          <p className="text-xs text-slate-400 mb-2">Pillar: <span className="text-[#FFC300] font-medium">{cluster.pillar}</span></p>
          <p className="text-xs text-slate-500">{cluster.children.length} supporting pages · {cluster.missing.length} missing topics</p>
          <div className="flex gap-2 mt-2">
            <div className="h-1.5 flex-1 bg-white/5 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all" style={{ width: `${cluster.authorityScore}%`, background: color }} />
            </div>
            <span className="text-xs text-slate-500 font-medium">{cluster.authorityScore}% authority</span>
          </div>
        </div>
        <button onClick={() => setExpanded(!expanded)} className="text-slate-400 hover:text-white transition-colors mt-1">
          <ChevronRight className={`w-4 h-4 transition-transform ${expanded ? "rotate-90" : ""}`} />
        </button>
      </div>

      {expanded && (
        <div className="border-t border-white/10 p-5 grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <h4 className="text-xs font-black text-white uppercase tracking-wider mb-3">Supporting Pages</h4>
            {cluster.children.length > 0 ? (
              <div className="space-y-1.5">
                {cluster.children.map((child, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-green-500/5 border border-green-500/10">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                    <span className="text-xs text-slate-300">{child}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500">No supporting pages yet</p>
            )}
          </div>
          <div>
            <h4 className="text-xs font-black text-white uppercase tracking-wider mb-3">Missing Topics</h4>
            <div className="space-y-1.5">
              {cluster.missing.map((topic, i) => (
                <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-red-500/5 border border-red-500/10">
                  <Plus className="w-3 h-3 text-red-400 flex-shrink-0" />
                  <span className="text-xs text-slate-400">{topic}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="sm:col-span-2">
            <h4 className="text-xs font-black text-white uppercase tracking-wider mb-2">Target Keywords</h4>
            <div className="flex flex-wrap gap-1">
              {cluster.keywords.split(", ").map((kw, i) => (
                <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-[#FFC300]/10 text-[#FFC300] border border-[#FFC300]/20">{kw}</span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TopicalAuthorityPage() {
  const avgAuthority = Math.round(PRESET_CLUSTERS.reduce((s, c) => s + c.authorityScore, 0) / PRESET_CLUSTERS.length);
  const weakClusters = PRESET_CLUSTERS.filter((c) => c.healthScore < 50).length;
  const totalMissing = PRESET_CLUSTERS.reduce((s, c) => s + c.missing.length, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-black text-white">Topical Authority Center</h2>
          <p className="text-slate-400 text-sm mt-1">Build topic clusters to dominate your niche in Google</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#FFC300] text-[#1C1B1A] font-black text-sm hover:bg-[#FFD60A] transition-all">
          <Plus className="w-4 h-4" /> New Cluster
        </button>
      </div>

      {/* Overview stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-6 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-5">
          <ScoreGauge score={avgAuthority} size="sm" showLabel={false} />
          <div>
            <p className="text-2xl font-black text-white">{avgAuthority}</p>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Avg Authority Score</p>
          </div>
        </div>
        <div className="p-5 rounded-2xl bg-white/5 border border-red-500/20">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <span className="text-xs font-bold text-red-400">Weak Clusters</span>
          </div>
          <p className="text-3xl font-black text-white">{weakClusters}</p>
          <p className="text-xs text-slate-500 mt-1">Need immediate attention</p>
        </div>
        <div className="p-5 rounded-2xl bg-white/5 border border-orange-500/20">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-4 h-4 text-orange-400" />
            <span className="text-xs font-bold text-orange-400">Missing Content</span>
          </div>
          <p className="text-3xl font-black text-white">{totalMissing}</p>
          <p className="text-xs text-slate-500 mt-1">Topics to create</p>
        </div>
      </div>

      {/* Content Roadmap */}
      <div className="p-5 rounded-2xl bg-[#FFC300]/5 border border-[#FFC300]/10">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-[#FFC300]" />
          <h3 className="font-black text-white">Suggested Content Roadmap</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {PRESET_CLUSTERS.flatMap((c) => c.missing.map((m) => ({ topic: m, cluster: c.name, priority: c.healthScore < 50 ? "High" : "Medium" }))).slice(0, 9).map((item, i) => (
            <div key={i} className="p-3 rounded-xl bg-white/5 border border-white/5">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-[#FFC300]">{item.cluster}</span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${item.priority === "High" ? "bg-red-500/20 text-red-300" : "bg-yellow-500/20 text-yellow-300"}`}>{item.priority}</span>
              </div>
              <p className="text-sm font-bold text-white">{item.topic}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Cluster cards */}
      <div className="space-y-4">
        <h3 className="font-black text-white">Topic Clusters ({PRESET_CLUSTERS.length})</h3>
        {PRESET_CLUSTERS.map((cluster) => (
          <ClusterCard key={cluster.slug} cluster={cluster} />
        ))}
      </div>
    </div>
  );
}
