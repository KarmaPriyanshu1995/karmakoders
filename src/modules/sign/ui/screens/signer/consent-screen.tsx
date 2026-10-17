"use client";

import * as React from "react";
import { AlertCircle, ShieldCheck } from "lucide-react";
import { Button } from "../../button";
import { Checkbox } from "../../form";
import type { SignerContextVM } from "../../signer-view-models";
import { TEXT_LINK } from "../parts";

/**
 * E-sign consent (PRD S7: before the signature pad is enabled). A plain-language summary of
 * /legal/esign-disclosure, which stays the full text. TODO(Step 9): `onAgree` records
 * consentAt and the CONSENTED audit event; until then it only moves to the review.
 */

export const CONSENT_LABEL = "I agree to use electronic records and signatures";

export const CONSENT_SUMMARY = [
  "You'll review and sign this document online instead of on paper.",
  "Your electronic signature has the same effect as signing by hand.",
  "You can download the signed document and print it, or ask the sender for a paper copy.",
  "You can stop at any time before signing, and choose to decline instead.",
] as const;

export function ConsentScreen({
  context,
  onAgree,
  onDecline,
  initialAgreed = false,
  initialShowError = false,
}: {
  context: SignerContextVM;
  onAgree: () => void | Promise<void>;
  onDecline: () => void;
  initialAgreed?: boolean;
  initialShowError?: boolean;
}) {
  const id = React.useId();
  const [agreed, setAgreed] = React.useState(initialAgreed);
  const [showError, setShowError] = React.useState(initialShowError);
  const [pending, setPending] = React.useState(false);
  const checkboxId = `${id}-agree`;
  const errorId = `${id}-error`;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!agreed) {
      setShowError(true);
      document.getElementById(checkboxId)?.focus();
      return;
    }
    setPending(true);
    try {
      await onAgree();
    } finally {
      setPending(false);
    }
  }

  return (
    <section aria-labelledby={`${id}-title`} className="space-y-6">
      <div className="space-y-3">
        <span className="flex size-12 items-center justify-center rounded-xl border border-[#FFC300]/20 bg-[#FFC300]/10 text-[#FFC300]">
          <ShieldCheck aria-hidden className="size-5" />
        </span>
        <p className="text-xs font-bold uppercase tracking-widest text-[#FFC300]">Before you sign</p>
        <h1 id={`${id}-title`} className="text-2xl font-black tracking-tight text-white">
          Agree to sign electronically
        </h1>
        <p className="leading-relaxed text-[#A39F97]">
          {context.senderName ? (
            <>
              <span className="text-white">{context.senderName}</span> asked you to sign{" "}
            </>
          ) : (
            "You've been asked to sign "
          )}
          <span className="break-words text-white">{context.documentTitle}</span>.
        </p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <h2 className="text-sm font-bold text-white">What this means</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-[#A39F97] marker:text-[#FFC300]">
          {CONSENT_SUMMARY.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        <p className="mt-4 text-sm">
          <a href="/legal/esign-disclosure" target="_blank" rel="noopener noreferrer" className={TEXT_LINK}>
            Read the full e-sign disclosure
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        </p>
      </div>

      <form noValidate onSubmit={submit} className="space-y-5">
        <div>
          <Checkbox
            id={checkboxId}
            label={CONSENT_LABEL}
            checked={agreed}
            required
            aria-invalid={showError && !agreed ? true : undefined}
            aria-describedby={showError && !agreed ? errorId : undefined}
            onChange={(e) => {
              setAgreed(e.target.checked);
              if (e.target.checked) setShowError(false);
            }}
          />
          {showError && !agreed ? (
            <p id={errorId} role="alert" className="flex items-start gap-1.5 pl-8 text-sm text-rose-300">
              <AlertCircle aria-hidden className="mt-0.5 size-4 shrink-0" />
              Tick the box to agree before you continue, or choose Decline to sign.
            </p>
          ) : null}
        </div>
        <div className="flex flex-col gap-3 sm:flex-row-reverse sm:justify-end">
          <Button type="submit" size="lg" className="w-full sm:w-auto" loading={pending} loadingText="Continuing…">
            Continue to the document
          </Button>
          <Button type="button" variant="secondary" size="lg" className="w-full sm:w-auto" onClick={onDecline}>
            Decline to sign
          </Button>
        </div>
      </form>
    </section>
  );
}
