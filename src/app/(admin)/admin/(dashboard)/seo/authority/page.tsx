"use client";

import { useState } from "react";
import { ScoreGauge } from "@/components/admin/seo/ScoreGauge";
import {
  Map, ChevronRight, Plus, TrendingUp, FileText,
  AlertTriangle, CheckCircle2, GitPullRequest, Bookmark, X, Sparkles
} from "lucide-react";
import { toast } from "sonner";

interface Cluster {
  name: string;
  slug: string;
  healthScore: number;
  authorityScore: number;
  pillar: string;
  children: string[];
  missing: string[];
  keywords: string;
}

const PRESET_CLUSTERS: Cluster[] = [
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

export default function TopicalAuthorityPage() {
  const [clusters, setClusters] = useState<Cluster[]>(PRESET_CLUSTERS);
  const [selectedClusterSlug, setSelectedClusterSlug] = useState<string>("web-development");
  const [roadmap, setRoadmap] = useState<Array<{ topic: string; cluster: string; status: string }>>([
    { topic: "Local SEO Guide", cluster: "SEO Services", status: "Researching" },
    { topic: "User Research Guide", cluster: "UI/UX Design", status: "Drafting" }
  ]);
  const [showNewClusterForm, setShowNewClusterForm] = useState(false);
  const [newClusterName, setNewClusterName] = useState("");
  const [newClusterPillar, setNewClusterPillar] = useState("");

  const activeCluster = clusters.find((c) => c.slug === selectedClusterSlug) || clusters[0];

  const handleAddToRoadmap = (topic: string, clusterName: string) => {
    if (roadmap.some((r) => r.topic === topic)) {
      toast.info("Topic is already on the roadmap");
      return;
    }
    setRoadmap((p) => [...p, { topic, cluster: clusterName, status: "Planned" }]);
    toast.success(`"${topic}" added to Content Roadmap`);
  };

  const handleCreateCluster = () => {
    if (!newClusterName || !newClusterPillar) return;
    const newCluster: Cluster = {
      name: newClusterName,
      slug: newClusterName.toLowerCase().replace(/\s+/g, "-"),
      healthScore: 10,
      authorityScore: 10,
      pillar: newClusterPillar,
      children: [],
      missing: ["Introduction Guide", "Best Practices Article", "Advanced Tutorial"],
      keywords: "general, industry topics"
    };
    setClusters((p) => [...p, newCluster]);
    setSelectedClusterSlug(newCluster.slug);
    setNewClusterName("");
    setNewClusterPillar("");
    setShowNewClusterForm(false);
    toast.success(`Cluster "${newClusterName}" created successfully!`);
  };

  // SVG Coordinates for cluster visual map
  const svgWidth = 500;
  const svgHeight = 240;
  const cx = 250;
  const cy = 120;

  // Compile nodes (children + missing)
  const childNodes = activeCluster.children.map((c, i) => {
    const angle = (i / (activeCluster.children.length + activeCluster.missing.length)) * 2 * Math.PI;
    const r = 85;
    return { name: c, x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle), isMissing: false };
  });

  const missingNodes = activeCluster.missing.map((m, i) => {
    const offsetIdx = i + activeCluster.children.length;
    const angle = (offsetIdx / (activeCluster.children.length + activeCluster.missing.length)) * 2 * Math.PI;
    const r = 85;
    return { name: m, x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle), isMissing: true };
  });

  const allNodes = [...childNodes, ...missingNodes];

  const avgAuthority = Math.round(clusters.reduce((s, c) => s + c.authorityScore, 0) / clusters.length);
  const weakClusters = clusters.filter((c) => c.healthScore < 50).length;
  const totalMissing = clusters.reduce((s, c) => s + c.missing.length, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-black text-white">Topical Authority Center</h2>
          <p className="text-slate-400 text-sm mt-1">Build comprehensive topical authority clusters to dominate search results</p>
        </div>
        <button
          onClick={() => setShowNewClusterForm(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#FFC300] text-[#1C1B1A] font-black text-sm hover:bg-[#FFD60A] transition-all"
        >
          <Plus className="w-4 h-4" /> New Cluster
        </button>
      </div>

      {/* Cluster Overview Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-6 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-5">
          <ScoreGauge score={avgAuthority} size="sm" showLabel={false} />
          <div>
            <p className="text-2xl font-black text-white">{avgAuthority}%</p>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Avg Authority Score</p>
          </div>
        </div>
        <div className="p-5 rounded-2xl bg-white/5 border border-red-500/20">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <span className="text-xs font-bold text-red-400">Weak Clusters</span>
          </div>
          <p className="text-3xl font-black text-white">{weakClusters}</p>
          <p className="text-xs text-slate-500 mt-1">Require additional coverage</p>
        </div>
        <div className="p-5 rounded-2xl bg-white/5 border border-orange-500/20">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-4 h-4 text-orange-400" />
            <span className="text-xs font-bold text-orange-400">Missing Content</span>
          </div>
          <p className="text-3xl font-black text-white">{totalMissing}</p>
          <p className="text-xs text-slate-500 mt-1">Recommended topics to write</p>
        </div>
      </div>

      {/* New Cluster Form */}
      {showNewClusterForm && (
        <div className="p-6 rounded-2xl bg-[#1C1B1A] border border-[#FFC300]/30 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-black text-white text-base">Create Topic Cluster</h3>
            <button onClick={() => setShowNewClusterForm(false)} className="text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Cluster Name</label>
              <input value={newClusterName} onChange={(e) => setNewClusterName(e.target.value)} placeholder="e.g. Artificial Intelligence" className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Pillar Page Title</label>
              <input value={newClusterPillar} onChange={(e) => setNewClusterPillar(e.target.value)} placeholder="e.g. Complete AI Guide for Businesses" className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none" />
            </div>
          </div>
          <button onClick={handleCreateCluster} className="px-4 py-2 rounded-xl bg-[#FFC300] text-[#1C1B1A] font-black text-xs hover:bg-[#FFD60A]">
            Generate Cluster Map
          </button>
        </div>
      )}

      {/* Visual Cluster Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cluster Selector List */}
        <div className="space-y-3 lg:col-span-1">
          <h3 className="font-black text-white text-sm">Select Cluster</h3>
          <div className="space-y-2">
            {clusters.map((c) => {
              const active = c.slug === selectedClusterSlug;
              const color = getHealthColor(c.healthScore);
              return (
                <div
                  key={c.slug}
                  onClick={() => setSelectedClusterSlug(c.slug)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${active ? "bg-[#FFC300]/10 border-[#FFC300]/30" : "bg-white/5 border-white/10 hover:bg-white/8"}`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <p className={`font-black text-xs ${active ? "text-[#FFC300]" : "text-white"}`}>{c.name}</p>
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase" style={{ background: `${color}15`, color }}>
                      {c.healthScore}% health
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 truncate">Pillar: {c.pillar}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Interactive SVG Cluster Map */}
        <div className="p-6 rounded-2xl bg-white/5 border border-white/10 lg:col-span-2 flex flex-col justify-between">
          <div className="mb-4">
            <h3 className="font-black text-white text-sm flex items-center gap-2">
              <Map className="w-4 h-4 text-[#FFC300]" /> Cluster Map Visualization
            </h3>
            <p className="text-slate-400 text-xs mt-0.5">Pillar page (center) linked to subtopics. Dotted red nodes represent missing pages.</p>
          </div>

          <div className="bg-[#141312] border border-white/5 rounded-xl p-4 flex justify-center items-center">
            <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full max-w-[500px] h-auto overflow-visible select-none">
              {/* Draw Connectors */}
              {allNodes.map((n, idx) => (
                <line
                  key={`line-${idx}`}
                  x1={cx}
                  y1={cy}
                  x2={n.x}
                  y2={n.y}
                  stroke={n.isMissing ? "#ef4444" : "#22c55e"}
                  strokeWidth="1.5"
                  strokeDasharray={n.isMissing ? "3 3" : "none"}
                />
              ))}

              {/* Center Node (Pillar) */}
              <circle cx={cx} cy={cy} r="25" fill="#FFC300" className="drop-shadow-[0_0_8px_rgba(255,195,0,0.3)]" />
              <text x={cx} y={cy + 3} textAnchor="middle" fill="#1C1B1A" fontSize="9" fontWeight="900">
                Pillar
              </text>

              {/* Surrounding Nodes */}
              {allNodes.map((n, idx) => (
                <g key={`node-${idx}`} className="group cursor-pointer">
                  <circle
                    cx={n.x}
                    cy={n.y}
                    r="16"
                    fill="#1C1B1A"
                    stroke={n.isMissing ? "#ef4444" : "#22c55e"}
                    strokeWidth="2"
                    className="transition-all hover:scale-105"
                  />
                  <text x={n.x} y={n.y + 3} textAnchor="middle" fill={n.isMissing ? "#ef4444" : "#22c55e"} fontSize="8" fontWeight="bold">
                    {n.isMissing ? "?" : "Page"}
                  </text>
                  {/* Hover tooltip label */}
                  <text
                    x={n.x}
                    y={n.y - 20}
                    textAnchor="middle"
                    fill="#ffffff"
                    fontSize="9"
                    fontWeight="black"
                    className="opacity-0 group-hover:opacity-100 transition-opacity bg-black p-1 pointer-events-none"
                  >
                    {n.name}
                  </text>
                </g>
              ))}
            </svg>
          </div>

          {/* Map Actions for missing pages */}
          <div className="mt-4 border-t border-white/5 pt-4 space-y-2">
            <p className="text-xs font-bold text-white uppercase tracking-wider">Unplanned Nodes</p>
            <div className="flex flex-wrap gap-2">
              {activeCluster.missing.map((topic) => (
                <button
                  key={topic}
                  onClick={() => handleAddToRoadmap(topic, activeCluster.name)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 hover:text-white transition-all text-xs font-semibold"
                >
                  <Plus className="w-3.5 h-3.5" /> Plan &ldquo;{topic}&rdquo;
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Planned Roadmap Queue */}
      <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Bookmark className="w-5 h-5 text-[#FFC300]" />
            <h3 className="font-black text-white text-base">Planned Content Roadmap</h3>
          </div>
          <span className="text-xs font-bold text-slate-400 bg-white/5 px-2.5 py-1 rounded-full">{roadmap.length} topics queued</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {roadmap.map((item, i) => (
            <div key={i} className="p-4 rounded-xl bg-white/3 border border-white/5 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[9px] font-black text-[#FFC300] uppercase tracking-wider">{item.cluster}</span>
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-[#FFC300]/10 text-[#FFC300]">
                    {item.status}
                  </span>
                </div>
                <p className="text-xs font-bold text-white mt-1">{item.topic}</p>
              </div>
              <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-white/5">
                <button
                  onClick={() => {
                    setRoadmap((p) => p.filter((_, idx) => idx !== i));
                    toast.info("Topic removed from roadmap");
                  }}
                  className="text-[10px] font-bold text-slate-500 hover:text-red-400 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
