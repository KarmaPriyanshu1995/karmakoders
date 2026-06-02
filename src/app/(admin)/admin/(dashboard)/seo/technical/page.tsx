"use client";

import { useState } from "react";
import { IssueList } from "@/components/admin/seo/IssueList";
import { ScoreGauge } from "@/components/admin/seo/ScoreGauge";
import { Wrench, RefreshCw, CheckCircle2, AlertCircle, AlertTriangle, Info } from "lucide-react";

interface AuditData {
  technicalScore: number;
  totalPages: number;
  missingTitles: number;
  duplicateTitles: number;
  missingDescriptions: number;
  duplicateDescriptions: number;
  missingH1: number;
  multipleH1: number;
  missingAlt: number;
  issues: Array<{ type: string; severity: string; description: string; suggestion: string; url?: string }>;
}

const ISSUE_TYPES = [
  { key: "all", label: "All Issues" },
  { key: "critical", label: "Critical" },
  { key: "important", label: "Important" },
  { key: "recommended", label: "Recommended" },
];

export default function TechnicalSeoPage() {
  const [auditData, setAuditData] = useState<AuditData | null>(null);
  const [running, setRunning] = useState(false);
  const [filter, setFilter] = useState("all");

  const runAudit = async () => {
    setRunning(true);
    const res = await fetch("/api/seo/audit", { method: "POST" });
    const data = await res.json();
    setAuditData(data.audit);
    setRunning(false);
  };

  const filteredIssues = auditData?.issues.filter((i) => filter === "all" || i.severity === filter) || [];

  const criticalCount = auditData?.issues.filter((i) => i.severity === "critical").length || 0;
  const importantCount = auditData?.issues.filter((i) => i.severity === "important").length || 0;
  const recommendedCount = auditData?.issues.filter((i) => i.severity === "recommended").length || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-black text-white">Technical SEO Center</h2>
          <p className="text-slate-400 text-sm mt-1">Full site technical audit — detect and fix all technical SEO issues</p>
        </div>
        <button
          onClick={runAudit}
          disabled={running}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#FFC300] text-[#1C1B1A] font-black text-sm hover:bg-[#FFD60A] transition-all disabled:opacity-60 shadow-[0_0_20px_rgba(255,195,0,0.3)]"
        >
          <RefreshCw className={`w-4 h-4 ${running ? "animate-spin" : ""}`} />
          {running ? "Running Audit..." : "Run Technical Audit"}
        </button>
      </div>

      {!auditData ? (
        <div className="flex flex-col items-center justify-center py-24 text-center rounded-2xl bg-white/3 border border-white/10">
          <Wrench className="w-16 h-16 text-slate-600 mb-4" />
          <p className="text-xl font-black text-white">No Audit Data</p>
          <p className="text-slate-500 mt-2 mb-6">Run a technical audit to scan your entire site for SEO issues</p>
          <button onClick={runAudit} disabled={running} className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[#FFC300] text-[#1C1B1A] font-black hover:bg-[#FFD60A] transition-all disabled:opacity-60">
            <RefreshCw className={`w-4 h-4 ${running ? "animate-spin" : ""}`} />
            {running ? "Scanning..." : "Start Audit Now"}
          </button>
        </div>
      ) : (
        <>
          {/* Score + issue breakdown */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-6 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-4">
              <ScoreGauge score={auditData.technicalScore} size="sm" showLabel={false} />
              <div>
                <p className="text-2xl font-black text-white">{Math.round(auditData.technicalScore)}</p>
                <p className="text-xs text-slate-400 font-bold">Technical Score</p>
                <p className="text-xs text-slate-500 mt-0.5">{auditData.totalPages} pages scanned</p>
              </div>
            </div>
            {[
              { label: "Critical", count: criticalCount, icon: AlertCircle, color: "#ef4444" },
              { label: "Important", count: importantCount, icon: AlertTriangle, color: "#FFC300" },
              { label: "Recommended", count: recommendedCount, icon: Info, color: "#3b82f6" },
            ].map((item) => (
              <div key={item.label} className="p-5 rounded-2xl bg-white/5 border border-white/10">
                <div className="flex items-center gap-2 mb-2">
                  <item.icon className="w-4 h-4" style={{ color: item.color }} />
                  <span className="text-xs font-bold text-slate-400">{item.label} Issues</span>
                </div>
                <p className="text-3xl font-black text-white">{item.count}</p>
              </div>
            ))}
          </div>

          {/* Issue breakdown grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {[
              { label: "Missing Titles", value: auditData.missingTitles, color: "#ef4444" },
              { label: "Duplicate Titles", value: auditData.duplicateTitles, color: "#f97316" },
              { label: "Missing Descs", value: auditData.missingDescriptions, color: "#ef4444" },
              { label: "Duplicate Descs", value: auditData.duplicateDescriptions, color: "#f97316" },
              { label: "Missing H1", value: auditData.missingH1, color: "#ef4444" },
              { label: "Multiple H1", value: auditData.multipleH1, color: "#f59e0b" },
              { label: "Missing ALT", value: auditData.missingAlt, color: "#f59e0b" },
            ].map((item) => (
              <div key={item.label} className="p-4 rounded-xl bg-white/5 border border-white/10">
                <p className="text-2xl font-black" style={{ color: item.value > 0 ? item.color : "#22c55e" }}>{item.value}</p>
                <p className="text-xs text-slate-400 font-medium mt-1">{item.label}</p>
                {item.value === 0 && <CheckCircle2 className="w-3.5 h-3.5 text-green-400 mt-1" />}
              </div>
            ))}
          </div>

          {/* Issues list */}
          <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
            <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
              <h3 className="font-black text-white">All Issues ({auditData.issues.length})</h3>
              <div className="flex gap-2 flex-wrap">
                {ISSUE_TYPES.map((t) => (
                  <button key={t.key} onClick={() => setFilter(t.key)} className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${filter === t.key ? "bg-[#FFC300]/10 text-[#FFC300] border border-[#FFC300]/20" : "text-slate-400 border border-white/10 hover:text-white"}`}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
            <IssueList
              issues={filteredIssues.map((i) => ({ ...i, severity: i.severity as "critical" | "important" | "recommended" }))}
              maxItems={100}
            />
          </div>
        </>
      )}
    </div>
  );
}
