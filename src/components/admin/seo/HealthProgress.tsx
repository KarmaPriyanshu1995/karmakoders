"use client";

export function getHealthColor(score: number): string {
  if (score >= 80) return "#22c55e";
  if (score >= 50) return "#eab308";
  return "#ef4444";
}

interface HealthProgressProps {
  score: number;
  showGauge?: boolean;
}

export function HealthProgress({ score, showGauge = false }: HealthProgressProps) {
  const color = getHealthColor(score);
  const rounded = Math.round(score);

  if (showGauge) {
    const r = 14;
    const circumference = 2 * Math.PI * r;
    const dashOffset = circumference - (Math.min(100, Math.max(0, score)) / 100) * circumference;
    return (
      <div className="flex items-center gap-2 min-w-[100px]">
        <svg width="36" height="36" viewBox="0 0 36 36" className="-rotate-90 flex-shrink-0">
          <circle cx="18" cy="18" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
          <circle
            cx="18" cy="18" r={r} fill="none" stroke={color} strokeWidth="3"
            strokeDasharray={circumference} strokeDashoffset={dashOffset} strokeLinecap="round"
          />
        </svg>
        <span className="text-xs font-black text-white">{rounded}</span>
      </div>
    );
  }

  return (
    <div className="min-w-[120px]">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-black text-white">{rounded}</span>
        <span className="text-[10px] text-slate-500">/100</span>
      </div>
      <div className="h-2 bg-white/5 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${Math.min(100, Math.max(0, score))}%`, background: color, boxShadow: `0 0 8px ${color}60` }}
        />
      </div>
    </div>
  );
}
