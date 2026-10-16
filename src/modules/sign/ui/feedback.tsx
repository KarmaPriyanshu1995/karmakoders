import * as React from "react";
import { AlertTriangle, CheckCircle2, Info, OctagonAlert, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { TONES, type Tone } from "./colors";

const ALERT_ICON: Record<Tone, LucideIcon> = {
  neutral: Info,
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  danger: OctagonAlert,
};

/**
 * Inline message panel (the site's LegalDisclaimer panel shape, tinted by tone). Use `live` for
 * messages that appear after an action so screen readers announce them; danger uses role="alert".
 */
export function Alert({
  tone = "info",
  title,
  children,
  action,
  live = false,
  className,
}: {
  tone?: Tone;
  title: React.ReactNode;
  children?: React.ReactNode;
  action?: React.ReactNode;
  live?: boolean;
  className?: string;
}) {
  const Icon = ALERT_ICON[tone];
  const role = live ? (tone === "danger" ? "alert" : "status") : undefined;
  return (
    <div role={role} className={cn("flex gap-3 rounded-xl border p-4 text-sm", TONES[tone].classes, className)}>
      <Icon aria-hidden className={cn("mt-0.5 size-4 shrink-0", TONES[tone].text)} />
      <div className="min-w-0 flex-1 space-y-1">
        <p className="font-semibold text-white">{title}</p>
        {children ? <div className="leading-relaxed text-[#A39F97]">{children}</div> : null}
        {action ? <div className="pt-2">{action}</div> : null}
      </div>
    </div>
  );
}

/** Loading placeholder. Decorative: pair it with a visible or sr-only "Loading…" message. */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("animate-pulse rounded-xl bg-white/10 motion-reduce:animate-none", className)} />;
}

function StateIcon({ icon: Icon, tone }: { icon: LucideIcon; tone: "accent" | "danger" }) {
  return (
    <span
      className={cn(
        "flex size-12 items-center justify-center rounded-xl border",
        tone === "accent" ? "border-[#FFC300]/20 bg-[#FFC300]/10 text-[#FFC300]" : TONES.danger.classes
      )}
    >
      <Icon aria-hidden className="size-5" />
    </span>
  );
}

/** Nothing here yet: say what will appear and offer the next step. */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("flex flex-col items-center gap-4 rounded-2xl border border-dashed border-white/15 px-6 py-12 text-center", className)}>
      <StateIcon icon={icon} tone="accent" />
      <div className="max-w-sm space-y-1">
        <h2 className="text-lg font-bold text-white">{title}</h2>
        {description ? <p className="text-sm leading-relaxed text-[#A39F97]">{description}</p> : null}
      </div>
      {action}
    </section>
  );
}

/** Something failed: say what happened and what to do, and offer a retry when possible. */
export function ErrorState({
  title = "Something went wrong",
  description,
  action,
  className,
}: {
  title?: React.ReactNode;
  description: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <section role="alert" className={cn("flex flex-col items-center gap-4 rounded-2xl border border-rose-500/20 bg-rose-500/5 px-6 py-12 text-center", className)}>
      <StateIcon icon={OctagonAlert} tone="danger" />
      <div className="max-w-sm space-y-1">
        <h2 className="text-lg font-bold text-white">{title}</h2>
        <p className="text-sm leading-relaxed text-[#A39F97]">{description}</p>
      </div>
      {action}
    </section>
  );
}
