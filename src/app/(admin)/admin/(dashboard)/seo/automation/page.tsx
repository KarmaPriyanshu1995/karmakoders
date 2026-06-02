"use client";

import { useEffect, useState } from "react";
import { Zap, Play, RefreshCw, CheckCircle2, AlertCircle, Clock, FileText, Image, Code2, Link2, BarChart3 } from "lucide-react";

interface AutomationLog {
  id: string; action: string; pageId: string | null; pageType: string | null;
  url: string | null; before: string | null; after: string | null;
  status: string; triggeredBy: string; createdAt: string;
}

const AUTOMATION_RULES = [
  { id: "meta_title", label: "Auto-generate Missing Meta Titles", icon: FileText, color: "#FFC300", description: "Automatically generate SEO-optimized meta titles for pages that don't have one" },
  { id: "meta_desc", label: "Auto-generate Missing Meta Descriptions", icon: FileText, color: "#8b5cf6", description: "Generate compelling meta descriptions using page title and content analysis" },
  { id: "alt_tags", label: "Auto-generate Missing ALT Tags", icon: Image, color: "#3b82f6", description: "Generate descriptive ALT text for images without one" },
  { id: "schema", label: "Auto-generate Missing Schema", icon: Code2, color: "#10b981", description: "Add basic Organization and Article schema to pages that lack structured data" },
  { id: "internal_links", label: "Auto-suggest Internal Links", icon: Link2, color: "#f97316", description: "Generate internal link suggestions based on topical relevance" },
  { id: "reports", label: "Weekly SEO Health Reports", icon: BarChart3, color: "#ec4899", description: "Generate and save automated weekly SEO health reports" },
];

const ACTION_LABELS: Record<string, string> = {
  generate_meta_title: "Generated Meta Title",
  generate_meta_description: "Generated Meta Description",
  generate_alt_tag: "Generated ALT Tag",
  generate_schema: "Generated Schema",
  suggest_link: "Suggested Internal Link",
};

export default function AutomationPage() {
  const [logs, setLogs] = useState<AutomationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [enabled, setEnabled] = useState<Record<string, boolean>>({ meta_title: true, meta_desc: true, alt_tags: false, schema: false, internal_links: true, reports: true });
  const [lastRun, setLastRun] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/seo/automation/run")
      .then((r) => r.json())
      .then((d) => setLogs(d.logs || []))
      .finally(() => setLoading(false));
  }, []);

  const runAutomation = async () => {
    setRunning(true);
    const res = await fetch("/api/seo/automation/run", { method: "POST" });
    const data = await res.json();
    if (data.logs) {
      setLogs((p) => [...data.logs, ...p].slice(0, 100));
    }
    setLastRun(new Date().toISOString());
    setRunning(false);
  };

  const successCount = logs.filter((l) => l.status === "success").length;
  const failCount = logs.filter((l) => l.status === "failed").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-black text-white">SEO Automation Center</h2>
          <p className="text-slate-400 text-sm mt-1">Automatically fix SEO issues, generate content, and maintain site health</p>
        </div>
        <div className="flex items-center gap-3">
          {lastRun && <span className="text-xs text-slate-500">Last run: {new Date(lastRun).toLocaleTimeString()}</span>}
          <button
            onClick={runAutomation}
            disabled={running}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#FFC300] text-[#1C1B1A] font-black text-sm hover:bg-[#FFD60A] transition-all disabled:opacity-60 shadow-[0_0_20px_rgba(255,195,0,0.3)]"
          >
            <Play className={`w-4 h-4 ${running ? "hidden" : ""}`} />
            <RefreshCw className={`w-4 h-4 ${running ? "animate-spin" : "hidden"}`} />
            {running ? "Running..." : "Run Automation"}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
          <div className="flex items-center gap-2 mb-2"><Zap className="w-4 h-4 text-[#FFC300]" /><span className="text-xs font-bold text-slate-400">Total Actions</span></div>
          <p className="text-3xl font-black text-white">{logs.length}</p>
        </div>
        <div className="p-5 rounded-2xl bg-green-500/10 border border-green-500/20">
          <div className="flex items-center gap-2 mb-2"><CheckCircle2 className="w-4 h-4 text-green-400" /><span className="text-xs font-bold text-green-400">Successful</span></div>
          <p className="text-3xl font-black text-white">{successCount}</p>
        </div>
        <div className="p-5 rounded-2xl bg-red-500/10 border border-red-500/20">
          <div className="flex items-center gap-2 mb-2"><AlertCircle className="w-4 h-4 text-red-400" /><span className="text-xs font-bold text-red-400">Failed</span></div>
          <p className="text-3xl font-black text-white">{failCount}</p>
        </div>
      </div>

      {/* Automation rules */}
      <div>
        <h3 className="font-black text-white mb-4">Automation Rules</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {AUTOMATION_RULES.map((rule) => {
            const Icon = rule.icon;
            const isEnabled = enabled[rule.id];
            return (
              <div key={rule.id} className={`p-5 rounded-2xl border transition-all ${isEnabled ? "border-opacity-30 bg-opacity-10" : "bg-white/3 border-white/10"}`} style={isEnabled ? { background: `${rule.color}08`, borderColor: `${rule.color}25` } : {}}>
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${rule.color}15` }}>
                      <Icon className="w-4 h-4" style={{ color: rule.color }} />
                    </div>
                    <p className="text-sm font-black text-white">{rule.label}</p>
                  </div>
                  {/* Toggle */}
                  <button
                    onClick={() => setEnabled((p) => ({ ...p, [rule.id]: !p[rule.id] }))}
                    className={`relative w-10 h-5 rounded-full transition-all flex-shrink-0 ${isEnabled ? "bg-[#FFC300]" : "bg-white/10"}`}
                  >
                    <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${isEnabled ? "left-5" : "left-0.5"}`} />
                  </button>
                </div>
                <p className="text-xs text-slate-400">{rule.description}</p>
                <p className="text-xs mt-1 font-bold" style={{ color: isEnabled ? rule.color : "#64748b" }}>{isEnabled ? "✓ Enabled" : "Disabled"}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Automation logs */}
      <div className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
          <h3 className="font-black text-white">Automation Log</h3>
          <span className="text-xs text-slate-500">{logs.length} entries</span>
        </div>
        {loading ? (
          <div className="text-center py-8 text-slate-500">Loading logs...</div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Clock className="w-10 h-10 text-slate-600 mb-3" />
            <p className="text-white font-bold">No automation logs yet</p>
            <p className="text-slate-500 text-sm mt-1">Click &ldquo;Run Automation&rdquo; to start</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5 max-h-80 overflow-y-auto">
            {logs.map((log) => (
              <div key={log.id} className="flex items-center gap-4 px-5 py-3 hover:bg-white/3 transition-colors">
                {log.status === "success" ? (
                  <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white">{ACTION_LABELS[log.action] || log.action}</p>
                  {log.url && <p className="text-xs text-slate-500 font-mono truncate">{log.url}</p>}
                  {log.after && <p className="text-xs text-slate-400 mt-0.5 truncate">{log.after}</p>}
                </div>
                <div className="text-right flex-shrink-0">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${log.triggeredBy === "auto" ? "bg-[#FFC300]/20 text-[#FFC300]" : "bg-blue-500/20 text-blue-300"}`}>{log.triggeredBy}</span>
                  <p className="text-xs text-slate-600 mt-0.5">{new Date(log.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
