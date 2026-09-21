"use client";

import { useEffect, useState } from "react";
import { FileText, Printer, RefreshCw, Eye } from "lucide-react";
import { toast } from "sonner";

interface ReportRow {
  id: string;
  type: string;
  title: string;
  createdAt: string;
  overallScore: number;
  issuesCount: number;
}

export default function SeoReportsPage() {
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const load = async () => {
    const res = await fetch("/api/seo/reports");
    const data = await res.json();
    const next: ReportRow[] = data.reports || [];
    setReports(next);
    setSelectedId((current) => current ?? next[0]?.id ?? null);
  };

  useEffect(() => {
    load()
      .catch(() => toast.error("Failed to load reports"))
      .finally(() => setLoading(false));
  }, []);

  const generate = async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/seo/reports", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate report");
      await load();
      setSelectedId(data.reportId);
      toast.success("Weekly health report saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to generate report");
    } finally {
      setGenerating(false);
    }
  };

  const printSelected = () => {
    if (!selectedId) return;
    window.open(`/api/seo/reports/${selectedId}/html`, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-black text-white">SEO Reports</h2>
          <p className="text-slate-400 text-sm mt-1">
            Weekly HTML health reports. Open a report and use the browser Print dialog to save a PDF.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={printSelected}
            disabled={!selectedId}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/10 text-white text-sm font-bold hover:bg-white/5 disabled:opacity-50"
          >
            <Printer className="w-4 h-4" /> Print / Save PDF
          </button>
          <button
            onClick={generate}
            disabled={generating}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#FFC300] text-[#1C1B1A] font-black text-sm hover:bg-[#FFD60A] disabled:opacity-60"
          >
            <RefreshCw className={`w-4 h-4 ${generating ? "animate-spin" : ""}`} />
            {generating ? "Generating..." : "Generate this week"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[320px_1fr] gap-6">
        <div className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
          <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
            <h3 className="font-black text-white">Archive</h3>
            <span className="text-xs text-slate-500">{reports.length}</span>
          </div>
          {loading ? (
            <p className="text-slate-500 text-sm px-5 py-8">Loading reports...</p>
          ) : reports.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
              <FileText className="w-10 h-10 text-slate-600 mb-3" />
              <p className="text-white font-bold">No reports yet</p>
              <p className="text-slate-500 text-sm mt-1">Generate one now, or wait for the Monday cron.</p>
            </div>
          ) : (
            <div className="divide-y divide-white/5 max-h-[640px] overflow-y-auto">
              {reports.map((report) => {
                const active = report.id === selectedId;
                return (
                  <button
                    key={report.id}
                    onClick={() => setSelectedId(report.id)}
                    className={`w-full text-left px-5 py-4 transition-colors ${active ? "bg-[#FFC300]/10" : "hover:bg-white/3"}`}
                  >
                    <p className="text-sm font-bold text-white">{report.title}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      {new Date(report.createdAt).toLocaleDateString()} · Score {report.overallScore} · {report.issuesCount} issues
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden min-h-[640px]">
          {selectedId ? (
            <iframe
              title="SEO weekly report"
              src={`/api/seo/reports/${selectedId}/html`}
              className="w-full h-[720px] bg-white"
            />
          ) : (
            <div className="h-[640px] flex flex-col items-center justify-center text-center px-6">
              <Eye className="w-10 h-10 text-slate-600 mb-3" />
              <p className="text-white font-bold">Select a report to preview</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
