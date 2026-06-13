"use client";

import { useEffect, useState } from "react";
import {
  BarChart3, TrendingUp, MousePointerClick, Eye,
  AlertTriangle, ExternalLink, Link2, LogOut, CheckCircle2,
  RefreshCw, ChevronRight, Sparkles
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

interface GscData {
  id: string;
  connected: boolean;
  siteUrl: string | null;
  totalClicks: number;
  totalImpressions: number;
  avgCtr: number;
  avgPosition: number;
  topQueriesJson: string | null;
}

interface QueryItem {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export default function SearchConsolePage() {
  const [gsc, setGsc] = useState<GscData | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const [siteUrl, setSiteUrl] = useState("https://karmakoders.com");

  const loadStatus = () => {
    fetch("/api/seo/search-console")
      .then((r) => r.json())
      .then((d) => setGsc(d.gsc))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const res = await fetch("/api/seo/search-console", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteUrl, connected: true })
      });
      const data = await res.json();
      setGsc(data.gsc);
      toast.success("Google Search Console connected and synced!");
    } catch (e) {
      toast.error("Failed to connect search console");
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      const res = await fetch("/api/seo/search-console", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteUrl, connected: false })
      });
      const data = await res.json();
      setGsc(data.gsc);
      toast.info("Google Search Console disconnected");
    } catch (e) {
      toast.error("Failed to disconnect search console");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 text-[#FFC300] animate-spin" />
          <p className="text-white font-bold">Loading GSC Intel...</p>
        </div>
      </div>
    );
  }

  const queries: QueryItem[] = gsc?.topQueriesJson ? JSON.parse(gsc.topQueriesJson) : [];

  const positionBuckets = [
    { range: "1-3", label: "Top 3 Rank", color: "#22c55e", count: queries.filter(q => q.position <= 3).length },
    { range: "4-10", label: "Page 1 Rank", color: "#FFC300", count: queries.filter(q => q.position > 3 && q.position <= 10).length },
    { range: "11-20", label: "Page 2 Rank", color: "#f97316", count: queries.filter(q => q.position > 10 && q.position <= 20).length },
    { range: "21+", label: "Page 3+ Rank", color: "#ef4444", count: queries.filter(q => q.position > 20).length },
  ];

  if (!gsc?.connected) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-black text-white">Search Console Center</h2>
          <p className="text-slate-400 text-sm mt-1">Connect Google Search Console to unlock click and ranking intelligence</p>
        </div>

        {/* Connection card */}
        <div className="p-8 rounded-2xl bg-white/5 border border-white/10 max-w-lg">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-5">
            <BarChart3 className="w-6 h-6 text-blue-400" />
          </div>
          <h3 className="text-xl font-black text-white mb-2">Connect Google Search Console</h3>
          <p className="text-slate-400 text-sm mb-6">Get clicks, impressions, CTR, ranking positions, and keyword data directly from Google.</p>

          <button onClick={() => setShowSetup(!showSetup)} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#FFC300] text-[#1C1B1A] font-black text-sm hover:bg-[#FFD60A] transition-all mb-4">
            Set Up Connection
          </button>

          {showSetup && (
            <div className="space-y-3 p-4 rounded-xl bg-white/5 border border-white/10">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Configuration</p>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Site URL</label>
                <input value={siteUrl} onChange={(e) => setSiteUrl(e.target.value)} className="w-full px-3 py-2 bg-[#1C1B1A] border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-[#FFC300]/30" />
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={handleConnect} disabled={connecting} className="w-full py-2.5 rounded-xl bg-[#FFC300] text-[#1C1B1A] font-black text-sm hover:bg-[#FFD60A] transition-all disabled:opacity-60 flex items-center justify-center gap-2">
                  {connecting && <RefreshCw className="w-4 h-4 animate-spin" />}
                  {connecting ? "Connecting..." : "Save & Connect"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-black text-white">Search Console Center</h2>
          <p className="text-slate-400 text-sm mt-1">Live Google Search Console integration for: <span className="text-[#FFC300] font-mono">{gsc.siteUrl}</span></p>
        </div>
        <button
          onClick={handleDisconnect}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white transition-all text-xs font-bold"
        >
          <LogOut className="w-4 h-4" /> Disconnect GSC
        </button>
      </div>

      {/* Connected stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Clicks", value: gsc.totalClicks.toLocaleString(), icon: MousePointerClick, color: "#FFC300" },
          { label: "Total Impressions", value: gsc.totalImpressions.toLocaleString(), icon: Eye, color: "#3b82f6" },
          { label: "Average CTR", value: `${(gsc.avgCtr * 100).toFixed(1)}%`, icon: TrendingUp, color: "#10b981" },
          { label: "Average Position", value: `#${gsc.avgPosition.toFixed(1)}`, icon: BarChart3, color: "#8b5cf6" },
        ].map((stat) => (
          <div key={stat.label} className="p-4 rounded-xl bg-white/5 border border-white/10">
            <div className="flex items-center gap-2 mb-1.5">
              <stat.icon className="w-3.5 h-3.5" style={{ color: stat.color }} />
              <span className="text-xs text-slate-400 font-bold">{stat.label}</span>
            </div>
            <p className="text-2xl font-black text-white">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Position distribution */}
      <div>
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-3">Position Distribution</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {positionBuckets.map((bucket) => (
            <div key={bucket.range} className="p-4 rounded-xl text-center border" style={{ background: `${bucket.color}08`, borderColor: `${bucket.color}25` }}>
              <p className="text-2xl font-black" style={{ color: bucket.color }}>{bucket.count}</p>
              <p className="text-xs font-bold text-slate-300 mt-1">{bucket.label}</p>
              <p className="text-[10px] text-slate-500 font-mono mt-0.5">Rank {bucket.range}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Top Search Queries */}
      <div className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
        <div className="p-4 border-b border-white/10 flex justify-between items-center">
          <h3 className="font-black text-white text-sm">Top Search Queries</h3>
          <span className="text-xs font-bold text-slate-500">{queries.length} queries synced</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5 bg-white/2">
                {["Query String", "Clicks", "Impressions", "CTR", "Position", "Actions"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-black text-slate-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {queries.map((q, i) => (
                <tr key={i} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                  <td className="px-4 py-3">
                    <p className="text-sm font-bold text-white">{q.query}</p>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-300">{q.clicks}</td>
                  <td className="px-4 py-3 text-sm text-slate-300">{q.impressions.toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm text-slate-300">{(q.ctr * 100).toFixed(1)}%</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${q.position <= 3 ? "bg-green-500/10 text-green-400 border border-green-500/20" : q.position <= 10 ? "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"}`}>
                      #{q.position.toFixed(1)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href="/admin/seo/keywords"
                      className="text-[10px] font-black text-[#FFC300] hover:text-white uppercase tracking-wider flex items-center gap-0.5"
                    >
                      Track Keyword <ChevronRight className="w-3 h-3" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
