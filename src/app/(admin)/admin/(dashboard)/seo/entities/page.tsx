"use client";

import { useEffect, useState } from "react";
import {
  Building2, Plus, Trash2, Tag, Globe, Briefcase,
  MapPin, Hash, Search, BookOpen, Share2, GitCommit
} from "lucide-react";
import { SchemaPreview } from "@/components/admin/seo/SchemaPreview";
import { ScoreGauge } from "@/components/admin/seo/ScoreGauge";
import { toast } from "sonner";

interface Entity {
  id: string; type: string; name: string; description: string | null; aliases: string | null; sitewide: boolean; createdAt: string;
}

const ENTITY_TYPES = [
  { value: "brand", label: "Brand", icon: Building2, color: "#FFC300" },
  { value: "person", label: "Person", icon: Tag, color: "#8b5cf6" },
  { value: "service", label: "Service", icon: Briefcase, color: "#3b82f6" },
  { value: "location", label: "Location", icon: MapPin, color: "#10b981" },
  { value: "topic", label: "Topic", icon: BookOpen, color: "#f97316" },
  { value: "keyword", label: "Keyword", icon: Hash, color: "#ec4899" },
  { value: "technology", label: "Technology", icon: Globe, color: "#06b6d4" },
];

const TYPE_CONFIG: Record<string, { color: string; label: string; icon: React.ElementType }> = Object.fromEntries(
  ENTITY_TYPES.map((t) => [t.value, { color: t.color, label: t.label, icon: t.icon }])
);

export default function EntitySeoPage() {
  const [entities, setEntities] = useState<Entity[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ type: "brand", name: "", description: "", aliases: "", sitewide: true });
  const [filterType, setFilterType] = useState("all");
  const [saving, setSaving] = useState(false);
  const [brand, setBrand] = useState<{ brandName: string; schemaJson: string } | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  const fetchData = () => {
    Promise.all([
      fetch("/api/seo/entities").then((r) => r.json()),
      fetch("/api/seo/brand").then((r) => r.json()),
    ]).then(([entData, brandData]) => {
      setEntities(entData.entities || []);
      setBrand(brandData.brand);
    }).finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAdd = async () => {
    if (!form.name) return;
    setSaving(true);
    try {
      const res = await fetch("/api/seo/entities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      setEntities((p) => [data.entity, ...p]);
      setForm({ type: "brand", name: "", description: "", aliases: "", sitewide: true });
      setShowForm(false);
      toast.success("Entity added successfully");
    } catch (e) {
      toast.error("Failed to add entity");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/seo/entities?id=${id}`, { method: "DELETE" });
      setEntities((p) => p.filter((e) => e.id !== id));
      toast.success("Entity deleted");
    } catch (e) {
      toast.error("Failed to delete entity");
    }
  };

  const filtered = filterType === "all" ? entities : entities.filter((e) => e.type === filterType);
  const entityScore = Math.min(100, Math.round((entities.length / 10) * 100));

  const schemaData = brand?.schemaJson ? JSON.parse(brand.schemaJson) : null;

  // SVG dimensions for Graph
  const graphWidth = 600;
  const graphHeight = 260;
  const centerX = 300;
  const centerY = 130;

  // Map entities to coordinates around the center Brand
  const graphNodes = entities.slice(0, 8).map((ent, idx, arr) => {
    const angle = (idx / arr.length) * 2 * Math.PI;
    const radius = 95;
    const x = centerX + radius * Math.cos(angle);
    const y = centerY + radius * Math.sin(angle);
    const config = TYPE_CONFIG[ent.type] || { color: "#FFC300", icon: Building2 };
    return {
      id: ent.id,
      name: ent.name,
      type: ent.type,
      x,
      y,
      color: config.color,
      icon: config.icon
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-black text-white">Entity SEO Center</h2>
          <p className="text-slate-400 text-sm mt-1">Help search engines map brand connections via a semantic knowledge graph</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#FFC300] text-[#1C1B1A] font-black text-sm hover:bg-[#FFD60A] transition-all"
        >
          <Plus className="w-4 h-4" /> Add Entity
        </button>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-6 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-5">
          <ScoreGauge score={entityScore} size="sm" showLabel={false} />
          <div>
            <p className="text-2xl font-black text-white">{entityScore}%</p>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Entity Completeness</p>
            <p className="text-xs text-slate-500 mt-0.5">{entities.length} nodes defined</p>
          </div>
        </div>
        {ENTITY_TYPES.slice(1, 3).map((type) => {
          const count = entities.filter((e) => e.type === type.value).length;
          return (
            <div key={type.value} className="p-5 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${type.color}15`, border: `1px solid ${type.color}30` }}>
                <type.icon className="w-5 h-5" style={{ color: type.color }} />
              </div>
              <div>
                <p className="text-xl font-black text-white">{count}</p>
                <p className="text-xs text-slate-400 font-bold">{type.label} Entities</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Dynamic Semantic Graph Board */}
      <div className="p-6 rounded-2xl bg-white/5 border border-white/10 relative overflow-hidden">
        <div className="flex items-center gap-2 mb-4">
          <Share2 className="w-4 h-4 text-[#FFC300]" />
          <h3 className="font-black text-white text-sm">Interactive Knowledge Graph Preview</h3>
        </div>

        <div className="flex justify-center items-center bg-[#141312] rounded-xl border border-white/5 p-4">
          <svg viewBox={`0 0 ${graphWidth} ${graphHeight}`} className="w-full max-w-[600px] h-auto overflow-visible select-none">
            {/* Draw Links */}
            {graphNodes.map((node) => {
              const isHighlighted = hoveredNode === null || hoveredNode === node.id;
              return (
                <g key={`link-${node.id}`} className="transition-opacity duration-300" style={{ opacity: isHighlighted ? 1 : 0.15 }}>
                  <line
                    x1={centerX}
                    y1={centerY}
                    x2={node.x}
                    y2={node.y}
                    stroke={node.color}
                    strokeWidth="1.5"
                    strokeDasharray="4 2"
                  />
                  {/* Label tag */}
                  <rect
                    x={(centerX + node.x) / 2 - 25}
                    y={(centerY + node.y) / 2 - 8}
                    width="50"
                    height="14"
                    rx="3"
                    fill="#1C1B1A"
                    stroke="rgba(255,255,255,0.05)"
                    strokeWidth="1"
                  />
                  <text
                    x={(centerX + node.x) / 2}
                    y={(centerY + node.y) / 2 + 2}
                    fill="#64748b"
                    fontSize="7"
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    {node.type === "person" ? "foundedBy" : node.type === "service" ? "offers" : "related"}
                  </text>
                </g>
              );
            })}

            {/* Central Node (Brand) */}
            <circle cx={centerX} cy={centerY} r="24" fill="#FFC300" className="drop-shadow-[0_0_10px_rgba(255,195,0,0.3)]" />
            <text x={centerX} y={centerY + 3} textAnchor="middle" fill="#1C1B1A" fontSize="9" fontWeight="900">
              {brand?.brandName ? brand.brandName.substring(0, 10) : "Brand"}
            </text>

            {/* Orbiting nodes */}
            {graphNodes.map((node) => {
              const IconComp = node.icon as any;
              const isHighlighted = hoveredNode === null || hoveredNode === node.id;
              return (
                <g
                  key={node.id}
                  className="cursor-pointer transition-opacity duration-300"
                  style={{ opacity: isHighlighted ? 1 : 0.2 }}
                  onMouseEnter={() => setHoveredNode(node.id)}
                  onMouseLeave={() => setHoveredNode(null)}
                >
                  <circle cx={node.x} cy={node.y} r="18" fill="#1C1B1A" stroke={node.color} strokeWidth="2.5" />
                  <foreignObject x={node.x - 7} y={node.y - 7} width="14" height="14">
                    <IconComp className="w-3.5 h-3.5" style={{ color: node.color }} />
                  </foreignObject>
                  {/* Tooltip Label */}
                  <text x={node.x} y={node.y + 28} textAnchor="middle" fill="#ffffff" fontSize="8" fontWeight="bold">
                    {node.name.length > 10 ? `${node.name.substring(0, 10)}...` : node.name}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* Add entity form */}
      {showForm && (
        <div className="p-6 rounded-2xl bg-white/5 border border-[#FFC300]/20 space-y-4">
          <h3 className="font-black text-white">Add New Entity</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Entity Type</label>
              <select value={form.type} onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))} className="w-full px-3 py-2.5 bg-[#1C1B1A] border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-[#FFC300]/30">
                {ENTITY_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Entity Name *</label>
              <input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="e.g. Karmakoders, React Development" className="w-full px-3 py-2.5 bg-[#1C1B1A] border border-white/10 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:border-[#FFC300]/30" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Description</label>
              <input value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} placeholder="Brief description of this entity" className="w-full px-3 py-2.5 bg-[#1C1B1A] border border-white/10 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:border-[#FFC300]/30" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Aliases (comma separated)</label>
              <input value={form.aliases} onChange={(e) => setForm((p) => ({ ...p, aliases: e.target.value }))} placeholder="e.g. Karma Koders, KK" className="w-full px-3 py-2.5 bg-[#1C1B1A] border border-white/10 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:border-[#FFC300]/30" />
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={handleAdd} disabled={saving || !form.name} className="px-5 py-2.5 rounded-xl bg-[#FFC300] text-[#1C1B1A] font-black text-sm hover:bg-[#FFD60A] transition-all disabled:opacity-50">
              {saving ? "Saving..." : "Add Entity"}
            </button>
            <button onClick={() => setShowForm(false)} className="px-5 py-2.5 rounded-xl border border-white/10 text-slate-400 font-bold text-sm hover:text-white transition-all">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setFilterType("all")} className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${filterType === "all" ? "bg-[#FFC300]/10 text-[#FFC300] border border-[#FFC300]/20" : "text-slate-400 border border-white/10 hover:text-white"}`}>
          All ({entities.length})
        </button>
        {ENTITY_TYPES.map((t) => {
          const count = entities.filter((e) => e.type === t.value).length;
          return (
            <button key={t.value} onClick={() => setFilterType(t.value)} className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${filterType === t.value ? "text-white border" : "text-slate-400 border border-white/10 hover:text-white"}`} style={filterType === t.value ? { background: `${t.color}15`, borderColor: `${t.color}30`, color: t.color } : {}}>
              {t.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Entity grid */}
      {loading ? (
        <div className="text-center py-12 text-slate-500">Loading entities...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 rounded-2xl bg-white/5 border border-white/10">
          <Building2 className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-white font-bold">No entities yet</p>
          <p className="text-slate-500 text-sm mt-1">Add entities to enrich your brand Knowledge Graph</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((entity) => {
            const cfg = TYPE_CONFIG[entity.type] || { color: "#FFC300", label: entity.type, icon: Building2 };
            return (
              <div key={entity.id} className="p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-white/20 transition-all group flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${cfg.color}20`, color: cfg.color }}>{cfg.label}</span>
                    <button onClick={() => handleDelete(entity.id)} className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-all">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-base font-black text-white mb-1">{entity.name}</p>
                  {entity.description && <p className="text-xs text-slate-400 mb-3 line-clamp-2">{entity.description}</p>}
                </div>
                {entity.aliases && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {entity.aliases.split(",").map((a, i) => (
                      <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-slate-500">{a.trim()}</span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Knowledge Graph Schema */}
      {schemaData && (
        <div className="pt-4">
          <h3 className="font-black text-white mb-4">Generated Knowledge Graph Schema</h3>
          <SchemaPreview schema={Array.isArray(schemaData) ? schemaData[0] : schemaData} title="Organization Schema" isValid />
        </div>
      )}
    </div>
  );
}
