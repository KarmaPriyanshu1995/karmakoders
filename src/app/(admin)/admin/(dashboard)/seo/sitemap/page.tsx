"use client";

import { useEffect, useState } from "react";
import {
  Globe,
  RefreshCw,
  ExternalLink,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Info,
  FileCode2,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

interface SitemapEntry {
  path: string;
  url: string;
  source: string;
}

interface CrawlIssue {
  code: string;
  severity: "critical" | "warning" | "info";
  message: string;
}

interface CrawlResult {
  url: string;
  path: string;
  status: number | null;
  ok: boolean;
  title: string | null;
  metaDescription: string | null;
  issues: CrawlIssue[];
  responseMs: number;
}

interface CrawlResponse {
  siteUrl: string;
  sitemapUrl: string;
  gscSitemapUrl: string;
  crawledAt: string;
  summary: {
    total: number;
    ok: number;
    withIssues: number;
    criticalIssues: number;
    totalIssues: number;
  };
  entries: SitemapEntry[];
  results: CrawlResult[];
  xmlPreview: string;
}

const severityIcon = {
  critical: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

const severityColor = {
  critical: "#ef4444",
  warning: "#FFC300",
  info: "#3b82f6",
};

export default function SiteCrawlSitemapPage() {
  const [entries, setEntries] = useState<SitemapEntry[]>([]);
  const [crawl, setCrawl] = useState<CrawlResponse | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [crawling, setCrawling] = useState(false);
  const [filter, setFilter] = useState<"all" | "issues" | "critical">("all");
  const [sitemapUrl, setSitemapUrl] = useState("https://www.karmakoders.com/sitemap.xml");
  const [gscUrl, setGscUrl] = useState("");

  useEffect(() => {
    fetch("/api/seo/sitemap-crawl")
      .then((r) => r.json())
      .then((data) => {
        setEntries(data.entries ?? []);
        setSitemapUrl(data.sitemapUrl ?? sitemapUrl);
        setGscUrl(data.gscSitemapUrl ?? "");
      })
      .catch(() => toast.error("Failed to load sitemap entries"))
      .finally(() => setLoadingList(false));
  }, []);

  const runCrawl = async () => {
    setCrawling(true);
    try {
      const res = await fetch("/api/seo/sitemap-crawl", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Crawl failed");
      setCrawl(data);
      setEntries(data.entries ?? []);
      toast.success(`Crawled ${data.summary.total} URLs — ${data.summary.criticalIssues} critical issues`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Crawl failed");
    } finally {
      setCrawling(false);
    }
  };

  const filteredResults =
    crawl?.results.filter((r) => {
      if (filter === "issues") return r.issues.length > 0;
      if (filter === "critical") return r.issues.some((i) => i.severity === "critical");
      return true;
    }) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-black text-white">Site Crawl & Sitemap</h2>
          <p className="text-slate-400 text-sm mt-1">
            Discover every indexable URL, crawl live pages for SEO issues, and submit your sitemap to Google.
          </p>
        </div>
        <button
          onClick={runCrawl}
          disabled={crawling}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#FFC300] text-[#1C1B1A] font-black text-sm hover:bg-[#FFD60A] transition-all disabled:opacity-60 shadow-[0_0_20px_rgba(255,195,0,0.3)]"
        >
          <RefreshCw className={`w-4 h-4 ${crawling ? "animate-spin" : ""}`} />
          {crawling ? "Crawling site..." : "Run full crawl"}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
          <div className="flex items-center gap-2 mb-2">
            <Globe className="w-4 h-4 text-[#FFC300]" />
            <span className="text-xs font-bold text-slate-400 uppercase">Sitemap URLs</span>
          </div>
          <p className="text-3xl font-black text-white">{loadingList ? "—" : entries.length}</p>
          <a href={sitemapUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-[#FFC300] mt-2 hover:underline">
            View live sitemap <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        {crawl ? (
          <>
            <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="w-4 h-4 text-green-400" />
                <span className="text-xs font-bold text-slate-400 uppercase">Pages OK</span>
              </div>
              <p className="text-3xl font-black text-white">{crawl.summary.ok}</p>
              <p className="text-xs text-slate-500 mt-1">of {crawl.summary.total} crawled</p>
            </div>
            <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-4 h-4 text-red-400" />
                <span className="text-xs font-bold text-slate-400 uppercase">Fixable issues</span>
              </div>
              <p className="text-3xl font-black text-white">{crawl.summary.totalIssues}</p>
              <p className="text-xs text-slate-500 mt-1">{crawl.summary.criticalIssues} critical</p>
            </div>
          </>
        ) : (
          <div className="md:col-span-2 p-5 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-4">
            <Search className="w-8 h-8 text-slate-600 flex-shrink-0" />
            <div>
              <p className="text-sm font-bold text-white">No crawl yet</p>
              <p className="text-xs text-slate-500 mt-0.5">Run a crawl to check titles, meta descriptions, H1 tags, and HTTP errors across every sitemap URL.</p>
            </div>
          </div>
        )}
      </div>

      <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-4">
        <h3 className="text-lg font-black text-white">Submit to Google Search Console</h3>
        <p className="text-sm text-slate-400">
          Your sitemap is live at <code className="text-[#FFC300]">{sitemapUrl}</code>. Open GSC and add it under Sitemaps to request indexing.
        </p>
        <div className="flex flex-wrap gap-3">
          {gscUrl && (
            <a
              href={gscUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-300 text-sm font-bold hover:bg-blue-500/20 transition-all"
            >
              Open GSC Sitemaps <ExternalLink className="w-4 h-4" />
            </a>
          )}
          <Link
            href="/admin/seo/search-console"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-300 text-sm font-bold hover:bg-white/10 transition-all"
          >
            Search Console settings
          </Link>
        </div>
      </div>

      {crawl && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h3 className="text-lg font-black text-white">Crawl results</h3>
            <div className="flex gap-2">
              {(["all", "issues", "critical"] as const).map((key) => (
                <button
                  key={key}
                  onClick={() => setFilter(key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    filter === key
                      ? "bg-[#FFC300]/15 text-[#FFC300] border border-[#FFC300]/30"
                      : "bg-white/5 text-slate-400 border border-white/10 hover:text-white"
                  }`}
                >
                  {key === "all" ? "All pages" : key === "issues" ? "With issues" : "Critical only"}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-white/5 text-slate-400 text-xs uppercase">
                  <tr>
                    <th className="p-3 font-bold">Path</th>
                    <th className="p-3 font-bold">Status</th>
                    <th className="p-3 font-bold">Title</th>
                    <th className="p-3 font-bold">Issues</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredResults.map((row) => (
                    <tr key={row.path} className="hover:bg-white/3">
                      <td className="p-3">
                        <a href={row.url} target="_blank" rel="noopener noreferrer" className="text-[#FFC300] hover:underline font-mono text-xs">
                          {row.path}
                        </a>
                      </td>
                      <td className="p-3">
                        <span className={row.ok ? "text-green-400" : "text-red-400"}>{row.status ?? "ERR"}</span>
                        <span className="text-slate-600 text-xs ml-2">{row.responseMs}ms</span>
                      </td>
                      <td className="p-3 text-slate-300 max-w-xs truncate">{row.title || "—"}</td>
                      <td className="p-3">
                        {row.issues.length === 0 ? (
                          <CheckCircle2 className="w-4 h-4 text-green-400" />
                        ) : (
                          <div className="space-y-1">
                            {row.issues.map((issue) => {
                              const Icon = severityIcon[issue.severity];
                              return (
                                <div key={issue.code} className="flex items-start gap-1.5 text-xs">
                                  <Icon className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: severityColor[issue.severity] }} />
                                  <span className="text-slate-400">{issue.message}</span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <FileCode2 className="w-5 h-5 text-slate-400" />
          <h3 className="text-lg font-black text-white">Sitemap URL list</h3>
          <span className="text-xs text-slate-500">({entries.length} URLs)</span>
        </div>
        <div className="rounded-2xl border border-white/10 max-h-80 overflow-y-auto divide-y divide-white/5">
          {entries.map((item) => (
            <div key={item.path} className="flex items-center justify-between gap-4 px-4 py-2.5 hover:bg-white/3 text-sm">
              <span className="font-mono text-slate-300 truncate">{item.path}</span>
              <span className="text-xs text-slate-500 flex-shrink-0">{item.source}</span>
            </div>
          ))}
        </div>
      </div>

      {crawl?.xmlPreview && (
        <div className="space-y-2">
          <h3 className="text-lg font-black text-white">XML preview</h3>
          <pre className="p-4 rounded-2xl bg-[#0d0d0c] border border-white/10 text-xs text-slate-400 overflow-x-auto max-h-64">
            {crawl.xmlPreview}
            {crawl.xmlPreview.length >= 8000 && "\n\n… truncated"}
          </pre>
        </div>
      )}
    </div>
  );
}
