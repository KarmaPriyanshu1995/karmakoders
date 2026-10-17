"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Coins, CreditCard, Send, Sparkles } from "lucide-react";
import { BlockedTypesNotice } from "../../blocked-types-notice";
import { Button } from "../../button";
import { Alert } from "../../feedback";
import { Checkbox } from "../../form";
import { LegalDisclaimer } from "../../legal-disclaimer";
import type { BuilderTemplateVM, PlanSummaryVM } from "../../view-models";
import { costLineFor, costLineText, type CostLine } from "../cost-line";
import type { BuilderState } from "./builder-state";

function CostDetail({ cost }: { cost: CostLine }) {
  switch (cost.kind) {
    case "free":
      return <>Free documents include the KarmaKoders footer.</>;
    case "pro":
      return <>No credit used. No KarmaKoders footer.</>;
    case "credit":
      return (
        <>
          You&apos;ll have {cost.balanceAfter} {cost.balanceAfter === 1 ? "credit" : "credits"} left. Credit documents have no
          KarmaKoders footer.
        </>
      );
    case "payment_required":
      return cost.reason === "out_of_free" ? (
        <>Your draft is saved. Buy credits or upgrade to Sign Pro to send it.</>
      ) : (
        <>Remove signers, or buy credits or upgrade to Sign Pro to send to up to 10.</>
      );
  }
}

export function CostLineNotice({ plan, signerCount }: { plan: PlanSummaryVM; signerCount: number }) {
  const cost = costLineFor(plan, signerCount);
  const blocked = cost.kind === "payment_required";
  return (
    <Alert
      tone={blocked ? "warning" : "info"}
      title={costLineText(cost)}
      action={
        blocked ? (
          <div className="flex flex-wrap gap-3">
            <Button asChild size="sm">
              <Link href="/tools/sign/billing">
                <Coins aria-hidden />
                Buy credits
              </Link>
            </Button>
            <Button asChild size="sm" variant="secondary">
              <Link href="/tools/sign/billing#plans">
                <Sparkles aria-hidden />
                Upgrade to Sign Pro
              </Link>
            </Button>
          </div>
        ) : undefined
      }
    >
      <CostDetail cost={cost} />
    </Alert>
  );
}

function SummaryRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-1 py-3 sm:grid-cols-[12rem_1fr]">
      <dt className="text-sm text-[#A39F97]">{label}</dt>
      <dd className="min-w-0 break-words text-white">{children}</dd>
    </div>
  );
}

export function ReviewStep({
  template,
  plan,
  state,
  confirmError,
  onConfirmChange,
  onSend,
}: {
  template: BuilderTemplateVM;
  plan: PlanSummaryVM;
  state: BuilderState;
  confirmError: string | null;
  onConfirmChange: (on: boolean) => void;
  onSend: () => void;
}) {
  const cost = costLineFor(plan, state.signers.length);
  const filled = template.fields.filter((f) => state.values[f.key]?.trim()).length;

  return (
    <div className="space-y-8">
      <section aria-labelledby="summary-heading" className="space-y-3">
        <h2 id="summary-heading" className="text-2xl font-black tracking-tight text-white">
          Summary
        </h2>
        <dl className="divide-y divide-white/10 rounded-2xl border border-white/10 bg-white/5 px-4">
          <SummaryRow label="Document">{template.name}</SummaryRow>
          <SummaryRow label="Details">
            {filled} of {template.fields.length} fields filled in
          </SummaryRow>
          <SummaryRow label="Signers">
            <ol className="space-y-1">
              {state.signers.map((s, i) => (
                <li key={s.id}>
                  {state.mode === "sequential" ? `${i + 1}. ` : ""}
                  <span className="font-semibold">{s.name || "Unnamed signer"}</span>{" "}
                  <span className="break-all text-[#A39F97]">{s.email}</span> <span className="text-[#A39F97]">· {s.role}</span>
                </li>
              ))}
            </ol>
          </SummaryRow>
          <SummaryRow label="Signing order">{state.mode === "sequential" ? "One after another" : "All at once"}</SummaryRow>
          <SummaryRow label="Link expires after">{state.expiryDays} days</SummaryRow>
          <SummaryRow label="Reminders">{state.reminders ? "On" : "Off"}</SummaryRow>
          {state.message.trim() ? <SummaryRow label="Message">{state.message}</SummaryRow> : null}
        </dl>
      </section>

      <section aria-labelledby="cost-heading" className="space-y-3">
        <h2 id="cost-heading" className="text-2xl font-black tracking-tight text-white">
          Cost
        </h2>
        <CostLineNotice plan={plan} signerCount={state.signers.length} />
      </section>

      <BlockedTypesNotice />
      <LegalDisclaimer />

      <div className="space-y-4">
        <Checkbox
          label="I confirm this document can be signed electronically where I and the signers are, and it isn't a type listed above."
          checked={state.confirmEligible}
          aria-invalid={confirmError ? true : undefined}
          aria-describedby={confirmError ? "confirm-eligible-error" : undefined}
          onChange={(e) => onConfirmChange(e.target.checked)}
        />
        {confirmError ? (
          <p id="confirm-eligible-error" role="alert" className="text-sm text-rose-300">
            {confirmError}
          </p>
        ) : null}
        {cost.kind === "payment_required" ? null : (
          <Button size="lg" icon={<Send />} onClick={onSend}>
            Send for signature
          </Button>
        )}
        {cost.kind === "payment_required" ? (
          <p className="flex items-center gap-2 text-sm text-[#A39F97]">
            <CreditCard aria-hidden className="size-4" />
            You can send once you have credits or Sign Pro.
          </p>
        ) : null}
      </div>
    </div>
  );
}
