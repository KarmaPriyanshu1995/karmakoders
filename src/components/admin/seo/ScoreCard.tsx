"use client";

import { getScoreColor } from "@/lib/seo/scorer";
import { LucideIcon, TrendingUp, TrendingDown, Minus } from "lucide-react";

interface ScoreCardProps {
  label: string;
  score: number;
  icon: LucideIcon;
  trend?: number; // positive = up, negative = down, 0 = flat
  description?: string;
  onClick?: () => void;
  accent?: string;
}

export function ScoreCard({ label, score, icon: Icon, trend, description, onClick, accent }: ScoreCardProps) {
  const color = accent || getScoreColor(score);

  const TrendIcon = trend === undefined ? null : trend > 0 ? TrendingUp : trend < 0 ? TrendingDown : Minus;
  const trendColor = trend === undefined ? "" : trend > 0 ? "text-green-400" : trend < 0 ? "text-red-400" : "text-slate-400";

  return (
    <div
      onClick={onClick}
      className={`group p-5 rounded-2xl bg-white/5 border border-white/10 hover:border-[${color}]/30 transition-all duration-300 hover:-translate-y-0.5 ${onClick ? "cursor-pointer" : ""}`}
      style={{ ["--hover-color" as string]: color }}
    >
      <div className="flex items-start justify-between mb-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: `${color}15`, border: `1px solid ${color}30` }}
        >
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
        {TrendIcon && (
          <div className={`flex items-center gap-1 text-xs font-bold ${trendColor}`}>
            <TrendIcon className="w-3 h-3" />
            {trend !== undefined && Math.abs(trend)}%
          </div>
        )}
      </div>

      {/* Score bar */}
      <div className="mb-3">
        <div className="flex items-end gap-2 mb-1.5">
          <span className="text-3xl font-black text-white">{Math.round(score)}</span>
          <span className="text-slate-500 text-sm font-medium mb-1">/100</span>
        </div>
        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-1000"
            style={{ width: `${score}%`, background: `linear-gradient(90deg, ${color}80, ${color})`, boxShadow: `0 0 8px ${color}60` }}
          />
        </div>
      </div>

      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{label}</p>
      {description && <p className="text-xs text-slate-500 mt-1">{description}</p>}
    </div>
  );
}
