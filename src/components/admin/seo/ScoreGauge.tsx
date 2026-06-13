"use client";

import { getScoreColor, getScoreLabel } from "@/lib/seo/scorer";

interface ScoreGaugeProps {
  score: number;
  label?: string;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

const sizes = {
  sm: { r: 32, cx: 40, cy: 40, svgSize: 80, stroke: 6, fontSize: "text-lg", labelSize: "text-xs" },
  md: { r: 44, cx: 56, cy: 56, svgSize: 112, stroke: 8, fontSize: "text-2xl", labelSize: "text-xs" },
  lg: { r: 60, cx: 76, cy: 76, svgSize: 152, stroke: 10, fontSize: "text-4xl", labelSize: "text-sm" },
};

export function ScoreGauge({ score, label, size = "md", showLabel = true }: ScoreGaugeProps) {
  const cfg = sizes[size];
  const circumference = 2 * Math.PI * cfg.r;
  const progress = Math.max(0, Math.min(100, score));
  const dashOffset = circumference - (progress / 100) * circumference;
  const color = getScoreColor(score);
  const scoreLabel = getScoreLabel(score);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: cfg.svgSize, height: cfg.svgSize }}>
        <svg width={cfg.svgSize} height={cfg.svgSize} viewBox={`0 0 ${cfg.svgSize} ${cfg.svgSize}`} className="-rotate-90">
          {/* Background track */}
          <circle
            cx={cfg.cx} cy={cfg.cy} r={cfg.r}
            fill="none"
            stroke="rgba(255,255,255,0.05)"
            strokeWidth={cfg.stroke}
          />
          {/* Score arc */}
          <circle
            cx={cfg.cx} cy={cfg.cy} r={cfg.r}
            fill="none"
            stroke={color}
            strokeWidth={cfg.stroke}
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            style={{
              transition: "stroke-dashoffset 1s ease, stroke 0.5s ease",
              filter: `drop-shadow(0 0 6px ${color}80)`,
            }}
          />
        </svg>
        {/* Score number */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`font-black text-white ${cfg.fontSize}`} style={{ textShadow: `0 0 20px ${color}60` }}>
            {Math.round(progress)}
          </span>
          {showLabel && <span className={`font-bold ${cfg.labelSize}`} style={{ color }}>{scoreLabel}</span>}
        </div>
      </div>
      {label && <p className="text-xs font-bold text-slate-400 uppercase tracking-widest text-center">{label}</p>}
    </div>
  );
}
