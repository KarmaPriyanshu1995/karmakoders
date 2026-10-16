import * as React from "react";
import { Check, Coins } from "lucide-react";
import { cn } from "@/lib/utils";

/** Progress through a multi-step flow. Each step shows its number or a check plus its label. */
export function Stepper({ steps, current, className }: { steps: string[]; current: number; className?: string }) {
  return (
    <ol className={cn("flex flex-wrap items-center gap-x-3 gap-y-2", className)}>
      {steps.map((label, index) => {
        const state = index < current ? "complete" : index === current ? "current" : "upcoming";
        return (
          <li key={label} aria-current={state === "current" ? "step" : undefined} className="flex items-center gap-2 text-sm">
            <span
              className={cn(
                "flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-bold",
                state === "complete" && "border-[#FFC300] bg-[#FFC300] text-[#1C1B1A]",
                state === "current" && "border-[#FFC300] text-[#FFC300]",
                state === "upcoming" && "border-white/35 text-[#A39F97]"
              )}
            >
              {state === "complete" ? <Check aria-hidden className="size-4" /> : index + 1}
            </span>
            <span className={cn(state === "upcoming" ? "text-[#A39F97]" : "font-semibold text-white")}>
              {label}
              {state === "complete" ? <span className="sr-only"> (completed)</span> : null}
            </span>
            {index < steps.length - 1 ? <span aria-hidden className="hidden h-px w-6 bg-white/15 sm:block" /> : null}
          </li>
        );
      })}
    </ol>
  );
}

/** Up to two initials from a name, or the first letter of an email's local part. */
export function initialsFrom(nameOrEmail: string): string {
  const value = nameOrEmail.trim();
  if (!value) return "?";
  if (value.includes("@") && !value.includes(" ")) return value[0].toUpperCase();
  const words = value.split(/\s+/).filter(Boolean);
  const letters = words.length > 1 ? words[0][0] + words[words.length - 1][0] : words[0][0];
  return letters.toUpperCase();
}

/** Initials avatar. Decorative by default: show the name next to it. */
export function Avatar({ name, size = "md", className }: { name: string; size?: "sm" | "md"; className?: string }) {
  return (
    <span
      aria-hidden
      title={name}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full border border-[#FFC300]/30 bg-[#FFC300]/10 font-bold text-[#FFC300]",
        size === "sm" ? "size-7 text-xs" : "size-9 text-sm",
        className
      )}
    >
      {initialsFrom(name)}
    </span>
  );
}

export function formatCredits(credits: number): string {
  return `${credits.toLocaleString("en-US")} ${credits === 1 ? "credit" : "credits"}`;
}

/** Wallet credit balance chip for the app header. Credits are integers. */
export function CreditBalanceChip({ credits, className }: { credits: number; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex min-h-9 items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 text-sm font-semibold text-white",
        className
      )}
    >
      <Coins aria-hidden className="size-4 text-[#FFC300]" />
      <span>
        <span className="sr-only">Balance: </span>
        {formatCredits(credits)}
      </span>
    </span>
  );
}

/** Labelled progress bar, e.g. signatures collected. The text value is always visible. */
export function ProgressMeter({
  value,
  max,
  label,
  valueText,
  className,
}: {
  value: number;
  max: number;
  label: string;
  valueText?: string;
  className?: string;
}) {
  const safeMax = Math.max(max, 1);
  const clamped = Math.min(Math.max(value, 0), safeMax);
  const text = valueText ?? `${clamped} of ${max}`;
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-medium text-white">{label}</span>
        <span className="text-[#A39F97]">{text}</span>
      </div>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={safeMax}
        aria-valuenow={clamped}
        aria-valuetext={text}
        className="h-2 overflow-hidden rounded-full bg-white/10"
      >
        <div
          className="h-full rounded-full bg-[#FFC300] text-[#1C1B1A] transition-[width] motion-reduce:transition-none"
          style={{ width: `${(clamped / safeMax) * 100}%` }}
        />
      </div>
    </div>
  );
}

export function Kbd({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <kbd className={cn("inline-flex min-w-6 items-center justify-center rounded-md border border-white/20 bg-white/5 px-1.5 py-0.5 font-mono text-xs text-white", className)}>
      {children}
    </kbd>
  );
}
