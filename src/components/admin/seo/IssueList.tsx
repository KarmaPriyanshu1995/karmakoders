"use client";

import { AlertTriangle, AlertCircle, Info, CheckCircle2 } from "lucide-react";

interface Issue {
  type: string;
  severity: "critical" | "important" | "recommended";
  description: string;
  suggestion?: string;
  url?: string;
  isFixed?: boolean;
}

interface IssueListProps {
  issues: Issue[];
  showFixed?: boolean;
  maxItems?: number;
  onFix?: (issue: Issue) => void;
}

const SEVERITY_CONFIG = {
  critical: {
    icon: AlertCircle,
    color: "text-red-400",
    bg: "bg-red-500/10",
    border: "border-red-500/20",
    badge: "bg-red-500/20 text-red-300",
    label: "Critical",
  },
  important: {
    icon: AlertTriangle,
    color: "text-yellow-400",
    bg: "bg-yellow-500/10",
    border: "border-yellow-500/20",
    badge: "bg-yellow-500/20 text-yellow-300",
    label: "Important",
  },
  recommended: {
    icon: Info,
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
    badge: "bg-blue-500/20 text-blue-300",
    label: "Recommended",
  },
};

export function IssueList({ issues, showFixed = false, maxItems = 50, onFix }: IssueListProps) {
  const filtered = issues
    .filter((i) => showFixed || !i.isFixed)
    .slice(0, maxItems);

  if (filtered.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <CheckCircle2 className="w-12 h-12 text-green-400 mb-3 opacity-70" />
        <p className="text-white font-bold">No issues found</p>
        <p className="text-slate-500 text-sm mt-1">This section is looking great!</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {filtered.map((issue, i) => {
        const cfg = SEVERITY_CONFIG[issue.severity];
        const Icon = cfg.icon;
        return (
          <div
            key={i}
            className={`p-4 rounded-xl border ${cfg.border} ${issue.isFixed ? "opacity-50" : ""} transition-all hover:scale-[1.005]`}
            style={{ background: issue.isFixed ? "rgba(255,255,255,0.02)" : undefined }}
          >
            <div className={`p-3.5 rounded-xl ${cfg.bg} border ${cfg.border}`}>
              <div className="flex items-start gap-3">
                <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${cfg.color}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className={`text-xs font-black px-2 py-0.5 rounded-full ${cfg.badge}`}>{cfg.label}</span>
                    {issue.url && <span className="text-xs text-slate-500 font-mono truncate">{issue.url}</span>}
                    {issue.isFixed && <span className="text-xs font-bold text-green-400">✓ Fixed</span>}
                  </div>
                  <p className="text-sm text-white font-medium">{issue.description}</p>
                  {issue.suggestion && (
                    <p className="text-xs text-slate-400 mt-1">💡 {issue.suggestion}</p>
                  )}
                </div>
                {onFix && !issue.isFixed && (
                  <button
                    onClick={() => onFix(issue)}
                    className="text-xs font-bold text-[#FFC300] hover:text-white transition-colors px-3 py-1.5 rounded-lg bg-[#FFC300]/10 hover:bg-[#FFC300]/20 border border-[#FFC300]/20 whitespace-nowrap"
                  >
                    Fix →
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
