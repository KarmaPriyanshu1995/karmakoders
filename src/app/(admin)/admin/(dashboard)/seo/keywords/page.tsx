"use client";

import { useEffect, useState } from "react";
import { TrendingUp, Eye, MousePointerClick, Plus, Search, Loader2, Trash2, X } from "lucide-react";
import { toast } from "sonner";

interface KeywordOpportunity {
  id: string;
  keyword: string;
  position: number;
  impressions: number;
  clicks: number;
  ctr: number;
  bucket: string;
  score: number;
}

const BUCKET_CONFIG: Record<string, { color: string; label: string; desc: string }> = {
  "1-3": { color: "#22c55e", label: "Top Rankings (1-3)", desc: "Maintain and defend your top spots!" },
  "4-10": { color: "#FFC300", label: "Quick Wins (4-10)", desc: "Close to page 1 top — optimize now!" },
  "11-20": { color: "#f97316", label: "Climbing (11-20)", desc: "Page 2 — push to page 1 with content updates" },
  "21-50": { color: "#ef4444", label: "Distant (21-50)", desc: "Need significant content investment" },
};

export default function KeywordOpportunityPage() {
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [keywords, setKeywords] = useState<KeywordOpportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newKeyword, setNewKeyword] = useState("");
  const [newPosition, setNewPosition] = useState("12");
  const [newImpressions, setNewImpressions] = useState("300");
  const [newClicks, setNewClicks] = useState("10");
  const [newCtr, setNewCtr] = useState("3.3");
  const [submitting, setSubmitting] = useState(false);

  const fetchKeywords = async () => {
    try {
      const res = await fetch("/api/seo/keywords");
      if (!res.ok) throw new Error("Failed to fetch keywords");
      const data = await res.json();
      setKeywords(data.keywords || []);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load keyword opportunities");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKeywords();
  }, []);

  const handleAddKeyword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyword.trim()) {
      toast.error("Please enter a keyword");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/seo/keywords", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keyword: newKeyword.trim(),
          position: parseFloat(newPosition),
          impressions: parseInt(newImpressions),
          clicks: parseInt(newClicks),
          ctr: parseFloat(newCtr),
        }),
      });

      if (!res.ok) throw new Error("Failed to add keyword");
      const data = await res.json();
      setKeywords((prev) => [data.keyword, ...prev]);
      toast.success(`Keyword "${newKeyword}" added successfully!`);
      setIsModalOpen(false);
      setNewKeyword("");
    } catch (e) {
      console.error(e);
      toast.error("Failed to add keyword");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteKeyword = async (id: string, keywordName: string) => {
    if (!confirm(`Are you sure you want to delete keyword "${keywordName}"?`)) return;
    try {
      const res = await fetch(`/api/seo/keywords?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      setKeywords((prev) => prev.filter((kw) => kw.id !== id));
      toast.success("Keyword deleted");
    } catch (e) {
      console.error(e);
      toast.error("Failed to delete keyword");
    }
  };

  const filtered = keywords
    .filter((k) => filter === "all" || k.bucket === filter)
    .filter((k) => !search || k.keyword.toLowerCase().includes(search.toLowerCase()));

  const buckets = Object.entries(BUCKET_CONFIG).map(([key, cfg]) => ({
    ...cfg,
    key,
    count: keywords.filter((k) => k.bucket === key).length,
    totalImpr: keywords.filter((k) => k.bucket === key).reduce((s, k) => s + k.impressions, 0),
  }));

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <Loader2 className="w-12 h-12 text-[#FFC300] animate-spin" />
        <p className="text-slate-400 font-bold">Retrieving keyword opportunities...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 relative">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-black text-white">Keyword Opportunity Center</h2>
          <p className="text-slate-400 text-sm mt-1">Find quick-win keywords to push to page 1 and drive more traffic</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#FFC300] text-[#1C1B1A] font-black text-sm hover:bg-[#FFD60A] transition-all"
        >
          <Plus className="w-4 h-4" /> Add Keyword
        </button>
      </div>

      {/* Bucket cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {buckets.map((bucket) => (
          <div
            key={bucket.key}
            className="p-5 rounded-2xl border cursor-pointer hover:-translate-y-0.5 transition-all"
            style={{ background: `${bucket.color}08`, borderColor: `${bucket.color}20` }}
            onClick={() => setFilter(bucket.key === filter ? "all" : bucket.key)}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-black uppercase tracking-wider" style={{ color: bucket.color }}>{bucket.label}</span>
              {filter === bucket.key && <span className="text-xs font-bold text-white bg-white/10 px-2 py-0.5 rounded-full">Active</span>}
            </div>
            <p className="text-3xl font-black text-white">{bucket.count}</p>
            <p className="text-xs text-slate-400 mt-1">keywords · {bucket.totalImpr.toLocaleString()} total impressions</p>
            <p className="text-xs text-slate-500 mt-2">{bucket.desc}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search keywords..."
          className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#FFC300]/30"
        />
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setFilter("all")}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${filter === "all" ? "bg-[#FFC300]/10 text-[#FFC300] border border-[#FFC300]/20" : "text-slate-400 border border-white/10 hover:text-white"}`}
        >
          All ({keywords.length})
        </button>
        {buckets.map((b) => (
          <button
            key={b.key}
            onClick={() => setFilter(b.key === filter ? "all" : b.key)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${filter === b.key ? "text-white" : "text-slate-400 border-white/10 hover:text-white"}`}
            style={filter === b.key ? { background: `${b.color}15`, borderColor: `${b.color}30`, color: b.color } : {}}
          >
            {b.key} ({b.count})
          </button>
        ))}
      </div>

      {/* Keywords table */}
      <div className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.02]">
                {["Keyword", "Position", "Impressions", "Clicks", "CTR", "Bucket", "Opp. Score", "Action"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-black text-slate-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-slate-500 text-sm">
                    No keywords found matching filters.
                  </td>
                </tr>
              ) : (
                filtered.map((kw) => {
                  const bucketCfg = BUCKET_CONFIG[kw.bucket] || BUCKET_CONFIG["11-20"];
                  return (
                    <tr key={kw.id} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                      <td className="px-4 py-3">
                        <p className="text-sm font-bold text-white">{kw.keyword}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm font-black text-white">#{Number(kw.position).toFixed(1)}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 text-sm text-white">
                          <Eye className="w-3.5 h-3.5 text-slate-500" />{kw.impressions.toLocaleString()}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 text-sm text-white">
                          <MousePointerClick className="w-3.5 h-3.5 text-slate-500" />{kw.clicks}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-sm font-bold ${kw.ctr < 2 ? "text-red-400" : kw.ctr < 5 ? "text-yellow-400" : "text-green-400"}`}>{Number(kw.ctr).toFixed(1)}%</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-bold px-2 py-1 rounded-full" style={{ background: `${bucketCfg.color}20`, color: bucketCfg.color }}>{kw.bucket}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-12 h-1.5 bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${kw.score}%`, background: "#FFC300" }} />
                          </div>
                          <span className="text-xs font-black text-[#FFC300]">{kw.score}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleDeleteKeyword(kw.id, kw.keyword)}
                            className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-white/5 rounded-lg transition-all"
                            title="Delete Keyword"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-slate-500 text-center">💡 Connect Google Search Console to pull real keyword data automatically</p>

      {/* Add Keyword Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-[#252422] border border-white/10 rounded-2xl p-6 relative">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-black text-white mb-4">Add Keyword Opportunity</h3>
            <form onSubmit={handleAddKeyword} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Keyword</label>
                <input
                  type="text"
                  required
                  value={newKeyword}
                  onChange={(e) => setNewKeyword(e.target.value)}
                  placeholder="e.g. customized software development"
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-[#FFC300]/30"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Position</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={newPosition}
                    onChange={(e) => setNewPosition(e.target.value)}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-[#FFC300]/30"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Impressions</label>
                  <input
                    type="number"
                    required
                    value={newImpressions}
                    onChange={(e) => setNewImpressions(e.target.value)}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-[#FFC300]/30"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Clicks</label>
                  <input
                    type="number"
                    required
                    value={newClicks}
                    onChange={(e) => setNewClicks(e.target.value)}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-[#FFC300]/30"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">CTR (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={newCtr}
                    onChange={(e) => setNewCtr(e.target.value)}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-[#FFC300]/30"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 bg-[#FFC300] text-[#1C1B1A] font-black rounded-xl hover:bg-[#FFD60A] transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-sm mt-6"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Adding...
                  </>
                ) : (
                  "Add Opportunity"
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
