"use client";

import { useEffect, useState } from "react";
import { ScoreGauge } from "@/components/admin/seo/ScoreGauge";
import { ScoreCard } from "@/components/admin/seo/ScoreCard";
import { IssueList } from "@/components/admin/seo/IssueList";
import {
  Wrench, FileText, Building2, Link2, Code2, MousePointerClick,
  Activity, AlertCircle, AlertTriangle, Info, Search, TrendingUp,
  RefreshCw, CheckCircle2, Globe, Eye, BarChart2, Zap, ExternalLink
} from "lucide-react";
import Link from "next/link";

interface DashboardData {
  scores: {
    technical: number; content: number; entity: number;
    internalLink: number; schema: number; ctr: number; overall: number;
  };
  audit: {
    totalPages: number; indexedPages: number; nonIndexedPages: number;
    missingTitles: number; missingDescriptions: number; missingSchema: number;
    missingFaq: number; orphanPages: number; lowContentPages: number; lastAuditAt: string | null;
  };
  issues: {
    critical: number; important: number; recommended: number; total: number;
    recent: Array<{ type: string; severity: string; description: string; url: string | null }>;
  };
  searchConsole: { connected: boolean; clicks?: number; impressions?: number; ctr?: number; position?: number };
  keywords: Array<{ keyword: string; position: number | null; impressions: number; score: number }>;
  brand: { name: string; score: number } | null;
}

function StatBadge({ label, value, color, icon: Icon, href }: { label: string; value: number | string; color: string; icon: React.ElementType; href?: string }) {
  const IconComp = Icon as React.FC<{ className?: string; style?: React.CSSProperties }>;
  const content = (
    <div
      className="flex items-center gap-3 p-4 rounded-xl border transition-all hover:-translate-y-0.5"
      style={{ background: `${color}08`, borderColor: `${color}20` }}
    >
      <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${color}15` }}>
        <IconComp className="w-4 h-4" style={{ color }} />
      </div>
      <div className="min-w-0">
        <p className="text-xl font-black text-white">{value}</p>
        <p className="text-xs font-bold text-slate-400 truncate">{label}</p>
      </div>
    </div>
  );
  return href ? <Link href={href}>{content}</Link> : <div>{content}</div>;
}

export default function SeoDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [runningAudit, setRunningAudit] = useState(false);

  useEffect(() => {
    fetch("/api/seo/dashboard")
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  const runAudit = async () => {
    setRunningAudit(true);
    await fetch("/api/seo/audit", { method: "POST" });
    const res = await fetch("/api/seo/dashboard");
    setData(await res.json());
    setRunningAudit(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <Activity className="w-10 h-10 text-[#FFC300] animate-pulse" />
          <p className="text-white font-bold">Loading SEO Intelligence...</p>
        </div>
      </div>
    );
  }

  const scores = data?.scores ?? { technical: 0, content: 0, entity: 0, internalLink: 0, schema: 0, ctr: 0, overall: 0 };
  const audit = data?.audit ?? { totalPages: 0, indexedPages: 0, nonIndexedPages: 0, missingTitles: 0, missingDescriptions: 0, missingSchema: 0, missingFaq: 0, orphanPages: 0, lowContentPages: 0, lastAuditAt: null };
  const issues = data?.issues ?? { critical: 0, important: 0, recommended: 0, total: 0, recent: [] };

  const scoreCards = [
    { label: "Technical SEO", score: scores.technical, icon: Wrench, href: "/admin/seo/technical", accent: "#3b82f6" },
    { label: "Content Quality", score: scores.content, icon: FileText, href: "/admin/seo/content", accent: "#8b5cf6" },
    { label: "Entity Coverage", score: scores.entity, icon: Building2, href: "/admin/seo/entities", accent: "#06b6d4" },
    { label: "Internal Linking", score: scores.internalLink, icon: Link2, href: "/admin/seo/internal-links", accent: "#10b981" },
    { label: "Schema Coverage", score: scores.schema, icon: Code2, href: "/admin/seo/schema", accent: "#f59e0b" },
    { label: "CTR Score", score: scores.ctr, icon: MousePointerClick, href: "/admin/seo/ctr", accent: "#ec4899" },
  ];

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-black text-white">SEO Intelligence Dashboard</h2>
          <p className="text-slate-400 text-sm mt-1">
            {audit.lastAuditAt
              ? `Last audit: ${new Date(audit.lastAuditAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}`
              : "No audit run yet"}
          </p>
        </div>
        <button
          onClick={runAudit}
          disabled={runningAudit}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#FFC300] text-[#1C1B1A] font-black text-sm hover:bg-[#FFD60A] transition-all shadow-[0_0_20px_rgba(255,195,0,0.3)] disabled:opacity-60"
        >
          <RefreshCw className={`w-4 h-4 ${runningAudit ? "animate-spin" : ""}`} />
          {runningAudit ? "Running Audit..." : "Run SEO Audit"}
        </button>
      </div>

      {/* Overall score + dimension scores */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Overall health score */}
        <div className="lg:col-span-1 p-8 rounded-2xl bg-white/5 border border-white/10 flex flex-col items-center justify-center gap-4">
          <ScoreGauge score={scores.overall} label="Overall SEO Health" size="lg" />
          <div className="grid grid-cols-3 gap-2 w-full text-center text-xs">
            <div>
              <div className="w-2 h-2 rounded-full bg-red-400 mx-auto mb-1" />
              <p className="font-black text-white">{issues.critical}</p>
              <p className="text-slate-500">Critical</p>
            </div>
            <div>
              <div className="w-2 h-2 rounded-full bg-yellow-400 mx-auto mb-1" />
              <p className="font-black text-white">{issues.important}</p>
              <p className="text-slate-500">Important</p>
            </div>
            <div>
              <div className="w-2 h-2 rounded-full bg-blue-400 mx-auto mb-1" />
              <p className="font-black text-white">{issues.recommended}</p>
              <p className="text-slate-500">Tips</p>
            </div>
          </div>
        </div>

        {/* Score cards grid */}
        <div className="lg:col-span-3 grid grid-cols-2 md:grid-cols-3 gap-4">
          {scoreCards.map((card) => (
            <Link key={card.label} href={card.href}>
              <ScoreCard label={card.label} score={card.score} icon={card.icon} accent={card.accent} />
            </Link>
          ))}
        </div>
      </div>

      {/* Site statistics */}
      <div>
        <h3 className="text-base font-black text-white mb-4">Site Overview</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <StatBadge label="Total Pages" value={audit.totalPages} color="#FFC300" icon={Globe} href="/admin/seo/analyzer" />
          <StatBadge label="Indexed Pages" value={audit.indexedPages} color="#22c55e" icon={CheckCircle2} />
          <StatBadge label="Non-Indexed" value={audit.nonIndexedPages} color="#ef4444" icon={Eye} />
          <StatBadge label="Missing Titles" value={audit.missingTitles} color="#f97316" icon={AlertCircle} href="/admin/seo/technical" />
          <StatBadge label="Missing Descs" value={audit.missingDescriptions} color="#f97316" icon={AlertTriangle} href="/admin/seo/technical" />
          <StatBadge label="Missing Schema" value={audit.missingSchema} color="#8b5cf6" icon={Code2} href="/admin/seo/schema" />
          <StatBadge label="Missing FAQs" value={audit.missingFaq} color="#06b6d4" icon={Info} href="/admin/seo/content" />
          <StatBadge label="Orphan Pages" value={audit.orphanPages} color="#ec4899" icon={Link2} href="/admin/seo/internal-links" />
          <StatBadge label="Low Content" value={audit.lowContentPages} color="#f59e0b" icon={FileText} href="/admin/seo/content" />
          <StatBadge label="Total Issues" value={issues.total} color="#64748b" icon={AlertCircle} href="/admin/seo/technical" />
        </div>
      </div>

      {/* Search Console + Keywords */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Search Console summary */}
        <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-black text-white">Search Console</h3>
            <Link href="/admin/seo/search-console" className="text-xs font-bold text-[#FFC300] hover:text-white transition-colors flex items-center gap-1">
              View Details <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
          {data?.searchConsole?.connected ? (
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: "Total Clicks", value: data.searchConsole.clicks?.toLocaleString() || "0", icon: MousePointerClick, color: "#FFC300" },
                { label: "Impressions", value: data.searchConsole.impressions?.toLocaleString() || "0", icon: Eye, color: "#3b82f6" },
                { label: "Avg CTR", value: `${((data.searchConsole.ctr || 0) * 100).toFixed(1)}%`, icon: BarChart2, color: "#10b981" },
                { label: "Avg Position", value: (data.searchConsole.position || 0).toFixed(1), icon: TrendingUp, color: "#8b5cf6" },
              ].map((stat) => (
                <div key={stat.label} className="p-3 rounded-xl bg-white/5 border border-white/5">
                  <div className="flex items-center gap-2 mb-1">
                    <stat.icon className="w-3.5 h-3.5" style={{ color: stat.color }} />
                    <span className="text-xs text-slate-400 font-medium">{stat.label}</span>
                  </div>
                  <p className="text-lg font-black text-white">{stat.value}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <BarChart2 className="w-10 h-10 text-slate-600 mb-3" />
              <p className="text-white font-bold text-sm">Search Console Not Connected</p>
              <p className="text-slate-500 text-xs mt-1 mb-4">Connect GSC to unlock click and ranking data</p>
              <Link
                href="/admin/seo/search-console"
                className="px-4 py-2 rounded-xl bg-[#FFC300]/10 border border-[#FFC300]/20 text-[#FFC300] text-xs font-bold hover:bg-[#FFC300]/20 transition-colors"
              >
                Connect Now →
              </Link>
            </div>
          )}
        </div>

        {/* Keyword opportunities */}
        <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-black text-white">Keyword Opportunities</h3>
            <Link href="/admin/seo/keywords" className="text-xs font-bold text-[#FFC300] hover:text-white transition-colors flex items-center gap-1">
              View All <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
          {data?.keywords && data.keywords.length > 0 ? (
            <div className="space-y-2">
              {data.keywords.slice(0, 5).map((kw, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5">
                  <span className="w-6 h-6 rounded-lg bg-[#FFC300]/10 text-[#FFC300] text-xs font-black flex items-center justify-center">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white truncate">{kw.keyword}</p>
                    <p className="text-xs text-slate-500">Position: {kw.position?.toFixed(0) ?? "—"} · {kw.impressions.toLocaleString()} impr.</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-black text-[#FFC300]">{Math.round(kw.score)}</p>
                    <p className="text-xs text-slate-500">score</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <TrendingUp className="w-10 h-10 text-slate-600 mb-3" />
              <p className="text-white font-bold text-sm">No Keyword Data Yet</p>
              <p className="text-slate-500 text-xs mt-1 mb-4">Connect Search Console or add keywords manually</p>
              <Link
                href="/admin/seo/keywords"
                className="px-4 py-2 rounded-xl bg-[#FFC300]/10 border border-[#FFC300]/20 text-[#FFC300] text-xs font-bold hover:bg-[#FFC300]/20 transition-colors"
              >
                Manage Keywords →
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Recent Issues */}
      <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-black text-white">Recent Issues</h3>
          <Link href="/admin/seo/technical" className="text-xs font-bold text-[#FFC300] hover:text-white transition-colors flex items-center gap-1">
            View All Issues <ExternalLink className="w-3 h-3" />
          </Link>
        </div>
        {issues.recent.length > 0 ? (
          <IssueList
            issues={issues.recent.map((i) => ({
              type: i.type,
              severity: i.severity as "critical" | "important" | "recommended",
              description: i.description,
              url: i.url || undefined,
            }))}
            maxItems={5}
          />
        ) : (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <Zap className="w-10 h-10 text-[#FFC300] mb-3 opacity-50" />
            <p className="text-white font-bold">Run an audit to detect issues</p>
            <p className="text-slate-500 text-sm mt-1">Click &ldquo;Run SEO Audit&rdquo; above to scan your site</p>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div>
        <h3 className="text-base font-black text-white mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: "Analyze Pages", href: "/admin/seo/analyzer", icon: Search, color: "#FFC300" },
            { label: "Fix Technical", href: "/admin/seo/technical", icon: Wrench, color: "#3b82f6" },
            { label: "Add Schema", href: "/admin/seo/schema", icon: Code2, color: "#8b5cf6" },
            { label: "Brand Setup", href: "/admin/seo/brand", icon: Building2, color: "#10b981" },
            { label: "AI Assistant", href: "/admin/seo/ai-assistant", icon: Zap, color: "#f97316" },
            { label: "Automate", href: "/admin/seo/automation", icon: Activity, color: "#ec4899" },
          ].map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="flex flex-col items-center gap-2 p-4 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 hover:-translate-y-0.5 transition-all text-center group"
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${action.color}15`, border: `1px solid ${action.color}30` }}>
                <action.icon className="w-5 h-5" style={{ color: action.color }} />
              </div>
              <span className="text-xs font-bold text-slate-400 group-hover:text-white transition-colors">{action.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
