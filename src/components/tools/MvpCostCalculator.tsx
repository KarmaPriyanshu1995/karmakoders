"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Calculator, Copy, Download, Mail, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { COMPLIANCE_OPTIONS, USER_LOADS, formatUsdRange, type ComplianceId, type UserLoadId } from "@/lib/tools/mvp-cost";
import {
  DESIGN_OPTIONS,
  MODULES,
  PACE_OPTIONS,
  PLATFORMS,
  PRODUCT_PRESETS,
  PRODUCT_TYPES,
  buildMvpPlan,
  mvpPlanMessage,
  type DesignId,
  type ModuleId,
  type PaceId,
  type PlatformId,
  type ProductId,
} from "@/lib/tools/mvp-plan";
import { DEFAULT_WHATSAPP_NUMBER } from "@/lib/content/post-types";
import { submitCalculatorLead } from "@/lib/actions";
import { trackEvent } from "@/lib/analytics";
import { trackUsage } from "@/components/tools/UsageBeacon";
import { toast } from "sonner";

function usd(amount: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(amount);
}

function toggleId<T extends string>(list: T[], id: T): T[] {
  return list.includes(id) ? list.filter((item) => item !== id) : [...list, id];
}

export function MvpCostCalculator({ compact = false }: { compact?: boolean }) {
  const preset = PRODUCT_PRESETS.saas;
  const [product, setProduct] = useState<ProductId>("saas");
  const [platforms, setPlatforms] = useState<PlatformId[]>(preset.platforms);
  const [modules, setModules] = useState<ModuleId[]>(preset.modules);
  const [design, setDesign] = useState<DesignId>("existing");
  const [pace, setPace] = useState<PaceId>("steady");
  const [userLoad, setUserLoad] = useState<UserLoadId>("under-1k");
  const [compliance, setCompliance] = useState<ComplianceId>("none");
  const [lead, setLead] = useState({ name: "", email: "", company: "", website: "" });
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const used = useRef(false);

  const plan = useMemo(
    () => buildMvpPlan({ product, platforms, modules, design, pace, userLoad, compliance }),
    [product, platforms, modules, design, pace, userLoad, compliance],
  );
  const message = mvpPlanMessage(plan);
  const maxLine = Math.max(1, ...plan.lines.map((line) => line.amount));
  const whatsapp = (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || DEFAULT_WHATSAPP_NUMBER).replace(/\D/g, "");
  const waHref = `https://wa.me/${whatsapp}?text=${encodeURIComponent(message)}`;
  const mailHref = `mailto:info@karmakoders.com?subject=${encodeURIComponent("MVP development plan")}&body=${encodeURIComponent(message)}`;

  function markUsed() {
    if (used.current) return;
    used.current = true;
    trackUsage("execute", "mvp-cost-calculator");
    trackEvent("calculator_complete", { range: formatUsdRange(plan.low, plan.high) });
  }

  function chooseProduct(next: ProductId) {
    const nextPreset = PRODUCT_PRESETS[next];
    setProduct(next);
    setPlatforms(nextPreset.platforms);
    setModules(nextPreset.modules);
    markUsed();
  }

  function choosePlatform(id: PlatformId) {
    setPlatforms((current) => {
      if (current.includes(id) && current.length === 1) return current;
      return toggleId(current, id);
    });
    markUsed();
  }

  async function copyPlan() {
    try {
      await navigator.clipboard.writeText(message);
      trackUsage("copy", "mvp-cost-calculator");
      markUsed();
      toast.success("Plan copied");
    } catch {
      toast.error("Could not copy the plan");
    }
  }

  function downloadPlan() {
    const blob = new Blob([message], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "mvp-development-plan.txt";
    link.click();
    URL.revokeObjectURL(url);
    trackUsage("download", "mvp-cost-calculator");
    markUsed();
  }

  async function sendPlan(event: React.FormEvent) {
    event.preventDefault();
    if (!lead.name.trim() || !lead.email.trim()) {
      toast.error("Enter your name and email to send the plan.");
      trackUsage("execute_error", "mvp-cost-calculator");
      return;
    }
    setSubmitting(true);
    try {
      await submitCalculatorLead({
        name: lead.name.trim(),
        email: lead.email.trim(),
        company: lead.company.trim() || undefined,
        website: lead.website,
        userLoad,
        tier: product,
        compliance,
        range: formatUsdRange(plan.low, plan.high),
        weeks: plan.weeks,
        summary: plan.summary,
      });
      setSent(true);
      markUsed();
      trackEvent("calculator_lead", { tier: product, compliance });
      toast.success("Plan sent. We saved it as an inquiry.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not send the plan.");
      trackUsage("execute_error", "mvp-cost-calculator");
    } finally {
      setSubmitting(false);
    }
  }

  const choice = "rounded-xl border px-3 py-2 text-left text-sm transition-colors";
  const on = "border-indigo-400 bg-indigo-500/10 text-white";
  const off = "border-white/10 text-slate-300 hover:border-white/20";

  return (
    <div className={`rounded-2xl border border-white/10 bg-white/[0.03] ${compact ? "p-4" : "p-5 md:p-7"}`}>
      <div className="flex items-start gap-3 mb-6">
        <span className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-300 shrink-0">
          <Calculator className="w-5 h-5" />
        </span>
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-indigo-300">MVP development planner</p>
          <h3 className="text-xl font-bold text-white mt-1">Scope, budget, and launch plan</h3>
          <p className="text-sm text-slate-400 mt-1">
            Choose the product, platforms, and modules. The range, phases, and team update as you go. It is a planning figure, not a quote.
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)]">
        <div className="space-y-6">
          <fieldset>
            <legend className="text-xs uppercase tracking-widest text-slate-500 mb-2">Product</legend>
            <div className="grid sm:grid-cols-2 gap-2">
              {PRODUCT_TYPES.map((item) => (
                <button key={item.id} type="button" aria-pressed={product === item.id} onClick={() => chooseProduct(item.id)} className={`${choice} ${product === item.id ? on : off}`}>
                  <span className="font-semibold">{item.label}</span>
                  <span className="block text-xs text-slate-400 mt-1">{item.includes}</span>
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="text-xs uppercase tracking-widest text-slate-500 mb-2">Platforms</legend>
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map((item) => (
                <button key={item.id} type="button" aria-pressed={platforms.includes(item.id)} onClick={() => choosePlatform(item.id)} className={`${choice} ${platforms.includes(item.id) ? on : off}`}>
                  {item.label}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="text-xs uppercase tracking-widest text-slate-500 mb-2">Modules</legend>
            <div className="grid sm:grid-cols-2 gap-2">
              {MODULES.map((item) => {
                const selected = modules.includes(item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => {
                      setModules((current) => toggleId(current, item.id));
                      markUsed();
                    }}
                    className={`${choice} ${selected ? on : off}`}
                  >
                    <span className="flex items-center justify-between gap-3">
                      <span className="font-semibold">{item.label}</span>
                      <span className="text-xs text-slate-400">+{usd(item.cost)}</span>
                    </span>
                    <span className="block text-xs text-slate-400 mt-1">{item.detail}</span>
                  </button>
                );
              })}
            </div>
            {modules.length > 4 ? (
              <button
                type="button"
                className="mt-2 text-xs font-semibold text-indigo-300"
                onClick={() => {
                  setModules((current) => current.slice(0, 3));
                  markUsed();
                }}
              >
                Trim to the first three modules
              </button>
            ) : null}
          </fieldset>

          <ChoiceRow label="Design" options={DESIGN_OPTIONS} value={design} onChange={(id) => { setDesign(id); markUsed(); }} onClass={on} offClass={off} choice={choice} />
          <ChoiceRow label="Pace" options={PACE_OPTIONS} value={pace} onChange={(id) => { setPace(id); markUsed(); }} onClass={on} offClass={off} choice={choice} />
          <ChoiceRow label="Launch scale" options={USER_LOADS} value={userLoad} onChange={(id) => { setUserLoad(id); markUsed(); }} onClass={on} offClass={off} choice={choice} />
          <ChoiceRow label="Compliance" options={COMPLIANCE_OPTIONS} value={compliance} onChange={(id) => { setCompliance(id); markUsed(); }} onClass={on} offClass={off} choice={choice} />
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 h-fit">
          <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-4">
            <p className="text-sm text-slate-400">{plan.summary}</p>
            <p className="text-3xl font-black text-white mt-2">{formatUsdRange(plan.low, plan.high)}</p>
            <p className="text-sm text-indigo-300 mt-1">About {plan.weeks} weeks · {formatUsdRange(plan.monthlyLow, plan.monthlyHigh)} / month to run</p>
            <p className="text-xs text-slate-500 mt-3">{plan.included}</p>
          </div>

          <div className="rounded-xl border border-white/10 p-4 space-y-3">
            <h4 className="text-sm font-bold text-white">Cost breakdown</h4>
            {plan.lines.map((line) => (
              <div key={line.id}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-300">{line.label}</span>
                  <span className="text-slate-500">{usd(line.amount)}</span>
                </div>
                <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                  <div className="h-full bg-indigo-400" style={{ width: `${Math.max(4, (line.amount / maxLine) * 100)}%` }} />
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-white/10 p-4">
            <h4 className="text-sm font-bold text-white mb-3">Roadmap</h4>
            <ol className="space-y-3">
              {plan.phases.map((phase) => (
                <li key={phase.name} className="flex gap-3">
                  <span className="text-xs font-bold text-indigo-300 w-10 shrink-0">{phase.weeks}w</span>
                  <span>
                    <span className="block text-sm font-semibold text-white">{phase.name}</span>
                    <span className="block text-xs text-slate-400">{phase.detail}</span>
                  </span>
                </li>
              ))}
            </ol>
          </div>

          <div className="rounded-xl border border-white/10 p-4">
            <h4 className="text-sm font-bold text-white mb-2">Team</h4>
            <ul className="text-sm text-slate-300 space-y-1">
              {plan.team.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>

          <div className="space-y-2">
            {plan.risks.map((risk) => (
              <p key={risk.text} className={`text-sm rounded-xl border px-3 py-2 ${risk.tone === "warn" ? "border-amber-400/30 text-amber-100" : "border-white/10 text-slate-300"}`}>
                {risk.text}
              </p>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="glass" onClick={copyPlan}>
              <Copy className="w-4 h-4 mr-2" /> Copy
            </Button>
            <Button type="button" variant="glass" onClick={downloadPlan}>
              <Download className="w-4 h-4 mr-2" /> Download
            </Button>
            <Button asChild variant="glass">
              <a href={waHref} target="_blank" rel="noopener noreferrer" onClick={() => { trackUsage("share", "mvp-cost-calculator"); markUsed(); }}>
                <MessageCircle className="w-4 h-4 mr-2" /> WhatsApp
              </a>
            </Button>
            <Button asChild variant="ghost" className="text-slate-300">
              <a href={mailHref} onClick={() => { trackUsage("share", "mvp-cost-calculator"); markUsed(); }}>
                <Mail className="w-4 h-4 mr-2" /> Email
              </a>
            </Button>
          </div>

          {sent ? (
            <p className="text-sm text-slate-300">We have the plan. A follow-up will use this scope.</p>
          ) : (
            <form onSubmit={sendPlan} className="grid gap-2">
              <div className="absolute -left-[9999px] h-0 w-0 overflow-hidden" aria-hidden="true">
                <input tabIndex={-1} autoComplete="off" name="website" value={lead.website} onChange={(e) => setLead((prev) => ({ ...prev, website: e.target.value }))} />
              </div>
              <input required name="name" placeholder="Your name" value={lead.name} onChange={(e) => setLead((prev) => ({ ...prev, name: e.target.value }))} className="h-11 bg-slate-950 border border-slate-800 rounded-xl px-3 text-white outline-none focus:border-indigo-500" />
              <input required type="email" name="email" placeholder="Work email" value={lead.email} onChange={(e) => setLead((prev) => ({ ...prev, email: e.target.value }))} className="h-11 bg-slate-950 border border-slate-800 rounded-xl px-3 text-white outline-none focus:border-indigo-500" />
              <input name="company" placeholder="Company (optional)" value={lead.company} onChange={(e) => setLead((prev) => ({ ...prev, company: e.target.value }))} className="h-11 bg-slate-950 border border-slate-800 rounded-xl px-3 text-white outline-none focus:border-indigo-500" />
              <Button type="submit" disabled={submitting} className="bg-indigo-600 hover:bg-indigo-500 text-white h-11">
                {submitting ? "Sending…" : "Send me this plan"}
              </Button>
            </form>
          )}

          <Button asChild variant="ghost" className="text-slate-300 px-0">
            <Link href="/contact" onClick={() => trackEvent("cta_click", { location: "calculator", cta: "book" })}>
              Book a call to refine this plan
            </Link>
          </Button>
        </aside>
      </div>
    </div>
  );
}

function ChoiceRow<T extends string>({
  label,
  options,
  value,
  onChange,
  onClass,
  offClass,
  choice,
}: {
  label: string;
  options: readonly { id: T; label: string }[];
  value: T;
  onChange: (id: T) => void;
  onClass: string;
  offClass: string;
  choice: string;
}) {
  return (
    <fieldset>
      <legend className="text-xs uppercase tracking-widest text-slate-500 mb-2">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button key={option.id} type="button" aria-pressed={value === option.id} onClick={() => onChange(option.id)} className={`${choice} ${value === option.id ? onClass : offClass}`}>
            {option.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
