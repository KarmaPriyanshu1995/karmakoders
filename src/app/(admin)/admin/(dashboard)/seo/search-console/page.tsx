"use client";

import { useState } from "react";
import { BarChart3, TrendingUp, TrendingDown, MousePointerClick, Eye, AlertTriangle, ExternalLink } from "lucide-react";

const MOCK_QUERIES = [
  { query: "web development company india", clicks: 0, impressions: 450, ctr: 0, position: 8.2 },
  { query: "react development services", clicks: 0, impressions: 280, ctr: 0, position: 12.5 },
  { query: "custom software development", clicks: 0, impressions: 190, ctr: 0, position: 15.8 },
  { query: "next.js development company", clicks: 0, impressions: 320, ctr: 0, position: 6.4 },
  { query: "karmakoders", clicks: 0, impressions: 85, ctr: 0, position: 2.1 },
  { query: "laravel development services", clicks: 0, impressions: 155, ctr: 0, position: 18.3 },
  { query: "mobile app development india", clicks: 0, impressions: 410, ctr: 0, position: 9.7 },
  { query: "ui ux design agency", clicks: 0, impressions: 220, ctr: 0, position: 14.2 },
];

const POSITION_BUCKETS = [
  { range: "1-3", label: "Top 3", color: "#22c55e", count: 1 },
  { range: "4-10", label: "Page 1", color: "#FFC300", count: 2 },
  { range: "11-20", label: "Page 2", color: "#f97316", count: 3 },
  { range: "21+", label: "Page 3+", color: "#ef4444", count: 2 },
];

export default function SearchConsolePage() {
  const [connected] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const [siteUrl, setSiteUrl] = useState("https://karmakoders.com");
  const [activeTab, setActiveTab] = useState<"overview" | "queries" | "pages" | "drops">("overview");

  if (!connected) {
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
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Google Client ID</label>
                <input placeholder="From Google Cloud Console" className="w-full px-3 py-2 bg-[#1C1B1A] border border-white/10 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:border-[#FFC300]/30" />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Google Client Secret</label>
                <input type="password" placeholder="From Google Cloud Console" className="w-full px-3 py-2 bg-[#1C1B1A] border border-white/10 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:border-[#FFC300]/30" />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Refresh Token</label>
                <input type="password" placeholder="OAuth refresh token" className="w-full px-3 py-2 bg-[#1C1B1A] border border-white/10 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:border-[#FFC300]/30" />
              </div>
              <div className="flex gap-2">
                <button className="flex-1 py-2 rounded-xl bg-[#FFC300] text-[#1C1B1A] font-black text-sm hover:bg-[#FFD60A] transition-all">Save & Connect</button>
              </div>
              <a href="https://search.google.com/search-console" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-[#FFC300] hover:text-white transition-colors">
                Open Google Search Console <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}
        </div>

        {/* Preview with mock data */}
        <div className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
          <div className="px-6 py-4 border-b border-white/10 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-yellow-400" />
            <p className="text-sm font-bold text-white">Preview — Sample Data (Connect GSC for real data)</p>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              {[
                { label: "Clicks", value: "—", icon: MousePointerClick, color: "#FFC300" },
                { label: "Impressions", value: "—", icon: Eye, color: "#3b82f6" },
                { label: "Avg CTR", value: "—", icon: TrendingUp, color: "#10b981" },
                { label: "Avg Position", value: "—", icon: BarChart3, color: "#8b5cf6" },
              ].map((stat) => (
                <div key={stat.label} className="p-4 rounded-xl bg-white/5">
                  <div className="flex items-center gap-2 mb-2">
                    <stat.icon className="w-3.5 h-3.5" style={{ color: stat.color }} />
                    <span className="text-xs text-slate-400">{stat.label}</span>
                  </div>
                  <p className="text-2xl font-black text-slate-600">{stat.value}</p>
                </div>
              ))}
            </div>

            {/* Position distribution */}
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-3">Keyword Position Distribution (Demo)</h4>
            <div className="grid grid-cols-4 gap-3 mb-6">
              {POSITION_BUCKETS.map((bucket) => (
                <div key={bucket.range} className="p-3 rounded-xl text-center" style={{ background: `${bucket.color}10`, border: `1px solid ${bucket.color}20` }}>
                  <p className="text-lg font-black" style={{ color: bucket.color }}>{bucket.count}</p>
                  <p className="text-xs font-bold text-slate-400 mt-0.5">{bucket.label}</p>
                  <p className="text-xs text-slate-600">#{bucket.range}</p>
                </div>
              ))}
            </div>

            {/* Sample queries */}
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-3">Opportunity Keywords (Demo)</h4>
            <div className="space-y-2">
              {MOCK_QUERIES.slice(0, 5).map((q, i) => (
                <div key={i} className="flex items-center gap-4 p-3 rounded-xl bg-white/3 border border-white/5">
                  <span className="text-xs font-black text-slate-500 w-4">{i + 1}</span>
                  <span className="text-sm font-medium text-white flex-1">{q.query}</span>
                  <div className="flex items-center gap-1 text-xs text-slate-400">
                    <Eye className="w-3 h-3" /> {q.impressions}
                  </div>
                  <div className={`text-xs font-bold px-2 py-0.5 rounded-full ${q.position <= 10 ? "bg-green-500/20 text-green-300" : q.position <= 20 ? "bg-yellow-500/20 text-yellow-300" : "bg-red-500/20 text-red-300"}`}>
                    #{q.position.toFixed(1)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-black text-white">Search Console Center</h2>
      <p className="text-slate-400 text-sm mt-1">Connected — fetching live data from Google Search Console</p>
    </div>
  );
}
