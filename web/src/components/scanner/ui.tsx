"use client";

const SEVERITY_STYLES: Record<string, string> = {
  critical: "border-rose-500/40 bg-rose-500/10 text-rose-200",
  high: "border-orange-500/40 bg-orange-500/10 text-orange-200",
  medium: "border-yellow-500/40 bg-yellow-500/10 text-yellow-100",
  low: "border-sky-500/40 bg-sky-500/10 text-sky-200",
  info: "border-slate-500/40 bg-slate-500/10 text-slate-300",
};

export function SeverityBadge({ severity }: { severity: string }) {
  const key = severity.toLowerCase();
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide ${
        SEVERITY_STYLES[key] ?? SEVERITY_STYLES.info
      }`}
    >
      {severity}
    </span>
  );
}

export function MethodBadge({ method }: { method: string }) {
  return (
    <span className="scanner-mono inline-flex rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 text-[11px] font-semibold text-scanner-brand-label">
      {method || "GET"}
    </span>
  );
}

export function StatusBadge({
  label,
  tone = "neutral",
}: {
  label: string;
  tone?: "neutral" | "success" | "warning" | "danger" | "info";
}) {
  const tones = {
    neutral: "border-white/10 bg-white/5 text-slate-300",
    success: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
    warning: "border-amber-500/30 bg-amber-500/10 text-amber-100",
    danger: "border-rose-500/30 bg-rose-500/10 text-rose-200",
    info: "border-scanner-brand/30 bg-scanner-brand-soft text-scanner-brand-label",
  };
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${tones[tone]}`}>
      {label}
    </span>
  );
}

export function ConfidenceBadge({ confidence }: { confidence: number | null | undefined }) {
  if (confidence == null || Number.isNaN(confidence)) return null;
  return (
    <span className="inline-flex rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-xs text-slate-300">
      Confidence {Math.round(confidence * 100)}%
    </span>
  );
}

export function MetricCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="scanner-card p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold tabular-nums text-white">{value}</p>
      {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="scanner-card-pad text-center">
      <h2 className="text-lg font-semibold text-white">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-slate-400">{body}</p>
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  );
}

export function GradeCard({
  grade,
  reason,
  algorithmVersion,
  animate,
}: {
  grade: string;
  reason?: string | null;
  algorithmVersion?: string | null;
  animate?: boolean;
}) {
  return (
    <div className={`scanner-card-pad ${animate ? "animate-grade-in" : ""}`}>
      <p className="scanner-label">Security grade</p>
      <p className="mt-3 text-6xl font-black tracking-tight text-white md:text-7xl">{grade}</p>
      <p className="mt-3 text-sm text-slate-400">
        Deterministic Phase C grade — not a probability or “% secure” score.
      </p>
      {reason ? <p className="mt-3 text-sm leading-relaxed text-slate-300">{reason}</p> : null}
      {algorithmVersion ? (
        <p className="mt-3 text-xs text-slate-500">Algorithm {algorithmVersion}</p>
      ) : null}
    </div>
  );
}
