"use client";

import { useEffect, useState } from "react";
import { Building2, Plus, Trash2, Tag, Globe, Briefcase, MapPin, Hash, Search, BookOpen } from "lucide-react";
import { SchemaPreview } from "@/components/admin/seo/SchemaPreview";
import { ScoreGauge } from "@/components/admin/seo/ScoreGauge";

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

const TYPE_CONFIG: Record<string, { color: string; label: string }> = Object.fromEntries(ENTITY_TYPES.map((t) => [t.value, { color: t.color, label: t.label }]));

export default function EntitySeoPage() {
  const [entities, setEntities] = useState<Entity[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ type: "brand", name: "", description: "", aliases: "", sitewide: true });
  const [filterType, setFilterType] = useState("all");
  const [saving, setSaving] = useState(false);
  const [brand, setBrand] = useState<{ brandName: string; schemaJson: string } | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/seo/entities").then((r) => r.json()),
      fetch("/api/seo/brand").then((r) => r.json()),
    ]).then(([entData, brandData]) => {
      setEntities(entData.entities || []);
      setBrand(brandData.brand);
    }).finally(() => setLoading(false));
  }, []);

  const handleAdd = async () => {
    if (!form.name) return;
    setSaving(true);
    const res = await fetch("/api/seo/entities", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const data = await res.json();
    setEntities((p) => [data.entity, ...p]);
    setForm({ type: "brand", name: "", description: "", aliases: "", sitewide: true });
    setShowForm(false);
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/seo/entities?id=${id}`, { method: "DELETE" });
    setEntities((p) => p.filter((e) => e.id !== id));
  };

  const filtered = filterType === "all" ? entities : entities.filter((e) => e.type === filterType);
  const entityScore = Math.min(100, (entities.length / 15) * 100);

  const schemaData = brand?.schemaJson ? JSON.parse(brand.schemaJson) : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-black text-white">Entity SEO Center</h2>
          <p className="text-slate-400 text-sm mt-1">Help Google understand Karmakoders as a real brand entity</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#FFC300] text-[#1C1B1A] font-black text-sm hover:bg-[#FFD60A] transition-all"
        >
          <Plus className="w-4 h-4" /> Add Entity
        </button>
      </div>

      {/* Entity scores */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-6 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-5">
          <ScoreGauge score={entityScore} size="sm" showLabel={false} />
          <div>
            <p className="text-2xl font-black text-white">{Math.round(entityScore)}</p>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Entity Score</p>
            <p className="text-xs text-slate-500 mt-0.5">{entities.length} entities defined</p>
          </div>
        </div>
        {ENTITY_TYPES.slice(0, 2).map((type) => {
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
        <div className="text-center py-16 rounded-2xl bg-white/3 border border-white/10">
          <Building2 className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-white font-bold">No entities yet</p>
          <p className="text-slate-500 text-sm mt-1">Add entities to help Google understand your brand</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((entity) => {
            const cfg = TYPE_CONFIG[entity.type] || { color: "#FFC300", label: entity.type };
            return (
              <div key={entity.id} className="p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-white/20 transition-all group">
                <div className="flex items-start justify-between mb-2">
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: `${cfg.color}20`, color: cfg.color }}>{cfg.label}</span>
                  <button onClick={() => handleDelete(entity.id)} className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-all">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-base font-black text-white mb-1">{entity.name}</p>
                {entity.description && <p className="text-xs text-slate-400 mb-2 line-clamp-2">{entity.description}</p>}
                {entity.aliases && (
                  <div className="flex flex-wrap gap-1">
                    {entity.aliases.split(",").map((a, i) => (
                      <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-slate-500">{a.trim()}</span>
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
        <div>
          <h3 className="font-black text-white mb-4">Generated Knowledge Graph Schema</h3>
          <SchemaPreview schema={Array.isArray(schemaData) ? schemaData[0] : schemaData} title="Organization Schema" isValid />
        </div>
      )}
    </div>
  );
}
