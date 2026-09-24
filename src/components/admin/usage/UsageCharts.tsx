interface DailyPoint {
  day: string;
  views: number;
  executes: number;
}

export function UsageLineChart({ daily }: { daily: DailyPoint[] }) {
  if (daily.length === 0) {
    return <p className="text-sm text-slate-500">No usage in this range yet.</p>;
  }
  const width = 680;
  const height = 200;
  const pad = 28;
  const max = Math.max(1, ...daily.map((point) => Math.max(point.views, point.executes)));
  const x = (index: number) => (daily.length === 1 ? width / 2 : pad + (index / (daily.length - 1)) * (width - pad * 2));
  const y = (value: number) => height - pad - (value / max) * (height - pad * 2);
  const line = (key: "views" | "executes") =>
    daily.map((point, index) => `${index === 0 ? "M" : "L"}${x(index).toFixed(1)},${y(point[key]).toFixed(1)}`).join(" ");
  const first = daily[0]?.day.slice(5) || "";
  const last = daily[daily.length - 1]?.day.slice(5) || "";

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-52" role="img" aria-label="Daily usage trend">
      <line x1={pad} y1={height - pad} x2={width - pad} y2={height - pad} stroke="rgba(255,255,255,0.12)" />
      <path d={line("views")} fill="none" stroke="#94a3b8" strokeWidth="2" />
      <path d={line("executes")} fill="none" stroke="#FFC300" strokeWidth="2.5" />
      <text x={pad} y={16} fill="#94a3b8" fontSize="11">
        {max.toLocaleString()}
      </text>
      <text x={pad} y={height - 8} fill="#94a3b8" fontSize="11">
        {first}
      </text>
      <text x={width - pad} y={height - 8} fill="#94a3b8" fontSize="11" textAnchor="end">
        {last}
      </text>
    </svg>
  );
}

export function UsageBarChart({ rows }: { rows: { slug: string; executes: number }[] }) {
  if (rows.length === 0) return <p className="text-sm text-slate-500">No tool executions in this range yet.</p>;
  const max = Math.max(1, ...rows.map((row) => row.executes));
  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <div key={row.slug}>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-slate-300">{row.slug}</span>
            <span className="text-slate-500">{row.executes.toLocaleString()}</span>
          </div>
          <div className="h-2 rounded-full bg-white/5 overflow-hidden">
            <div className="h-full bg-[#FFC300]" style={{ width: `${Math.max(4, (row.executes / max) * 100)}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}
