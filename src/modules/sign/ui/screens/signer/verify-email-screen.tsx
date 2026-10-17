"use client";

import * as React from "react";
import { MailCheck } from "lucide-react";
import { Button } from "../../button";
import { FormField, Input } from "../../form";
import type { SignerActionResult, SignerContextVM } from "../../signer-view-models";

/**
 * Signer email OTP step. Presentational: the page passes `actions` (the live ones POST to
 * /api/tools/sign/signing/otp/*). There is no email field, so the signer can't change where the
 * code goes. The code is never logged or kept beyond this input.
 */

export const OTP_RESEND_COOLDOWN_SEC = 60;
export const OTP_LENGTH = 6;

export type VerifyEmailActions = {
  requestCode: () => Promise<SignerActionResult>;
  verifyCode: (code: string) => Promise<SignerActionResult>;
  /** The session ended (expired, or the document changed): the page shows the expired state. */
  onSessionExpired: () => void;
  /** Verified: the page moves on to consent. */
  onVerified: () => void;
};

const NETWORK_ERROR = "We couldn't reach KarmaKoders Sign. Check your connection and try again.";

/** Keeps digits only, so pasting "123 456" or "123-456" works. */
export function normaliseOtpInput(value: string): string {
  return value.replace(/\D/g, "").slice(0, OTP_LENGTH);
}

export function VerifyEmailScreen({
  context,
  actions,
  initialStep = "send",
  initialCode = "",
  initialError = null,
  initialCooldown = 0,
}: {
  context: SignerContextVM;
  actions: VerifyEmailActions;
  /** Preview and tests only: start on a later step. */
  initialStep?: "send" | "code";
  initialCode?: string;
  initialError?: string | null;
  initialCooldown?: number;
}) {
  const id = React.useId();
  const [step, setStep] = React.useState(initialStep);
  const [code, setCode] = React.useState(initialCode);
  const [error, setError] = React.useState<string | null>(initialError);
  const [status, setStatus] = React.useState("");
  const [cooldown, setCooldown] = React.useState(initialCooldown);
  const [pending, setPending] = React.useState<"send" | "resend" | "verify" | null>(null);
  const codeRef = React.useRef<HTMLInputElement>(null);
  const movedToCode = React.useRef(false);

  React.useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  React.useEffect(() => {
    // Focus the code field after the signer asks for a code, not on first render.
    if (step === "code" && movedToCode.current) codeRef.current?.focus();
  }, [step]);

  function fail(result: Exclude<SignerActionResult, { ok: true }>) {
    setStatus("");
    if (result.kind === "expired") return actions.onSessionExpired();
    setError(result.kind === "network" ? NETWORK_ERROR : result.message);
  }

  async function run(kind: "send" | "resend" | "verify", call: () => Promise<SignerActionResult>) {
    setError(null);
    setPending(kind);
    try {
      return await call();
    } catch {
      return { ok: false, kind: "network", message: NETWORK_ERROR } as const;
    } finally {
      setPending(null);
    }
  }

  async function sendCode(isResend: boolean) {
    setStatus(isResend ? "Sending a new code…" : "Sending your code…");
    const result = await run(isResend ? "resend" : "send", actions.requestCode);
    if (!result.ok) return fail(result);
    movedToCode.current = true;
    setStep("code");
    setCode("");
    setCooldown(OTP_RESEND_COOLDOWN_SEC);
    setStatus(`We sent a 6-digit code to ${context.maskedEmail}. It expires in 10 minutes.`);
    if (isResend) codeRef.current?.focus();
  }

  async function verify() {
    if (code.length !== OTP_LENGTH) {
      setError("Enter the 6-digit code from the email.");
      codeRef.current?.focus();
      return;
    }
    setStatus("Checking your code…");
    const result = await run("verify", () => actions.verifyCode(code));
    if (!result.ok) {
      fail(result);
      codeRef.current?.select();
      return;
    }
    setStatus("Email confirmed.");
    actions.onVerified();
  }

  const busy = pending !== null;

  return (
    <section aria-labelledby={`${id}-title`} className="space-y-6">
      <div className="space-y-3">
        <span className="flex size-12 items-center justify-center rounded-xl border border-[#FFC300]/20 bg-[#FFC300]/10 text-[#FFC300]">
          <MailCheck aria-hidden className="size-5" />
        </span>
        <p className="text-xs font-bold uppercase tracking-widest text-[#FFC300]">Confirm it&apos;s you</p>
        <h1 id={`${id}-title`} className="break-words text-2xl font-black tracking-tight text-white">
          {context.documentTitle}
        </h1>
        {context.senderName ? (
          <p className="text-sm text-[#A39F97]">
            Sent by <span className="text-white">{context.senderName}</span>
          </p>
        ) : null}
        <p className="leading-relaxed text-[#A39F97]">
          Before you can review and sign, we&apos;ll email a 6-digit code to{" "}
          <span className="font-semibold text-white">{context.maskedEmail}</span>.
        </p>
      </div>

      <form
        className="space-y-5"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          if (busy) return;
          if (step === "send") void sendCode(false);
          else void verify();
        }}
      >
        {step === "code" ? (
          <FormField label="6-digit code" error={error ?? undefined} hint="Check your inbox and spam folder.">
            <Input
              ref={codeRef}
              name="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={OTP_LENGTH + 2}
              value={code}
              disabled={pending === "verify"}
              onChange={(e) => setCode(normaliseOtpInput(e.target.value))}
              onPaste={(e) => {
                e.preventDefault();
                setCode(normaliseOtpInput(e.clipboardData.getData("text")));
              }}
              placeholder="000000"
              className="h-14 text-center font-mono text-2xl tracking-[0.4em]"
            />
          </FormField>
        ) : error ? (
          <p role="alert" className="text-sm text-rose-300">
            {error}
          </p>
        ) : null}

        <p role="status" aria-live="polite" className={step === "code" ? "text-sm text-[#A39F97]" : "sr-only"}>
          {status}
        </p>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {step === "send" ? (
            <Button type="submit" size="lg" className="w-full sm:w-auto" loading={pending === "send"} loadingText="Sending…">
              Email me a code
            </Button>
          ) : (
            <>
              <Button type="submit" size="lg" className="w-full sm:w-auto" loading={pending === "verify"} loadingText="Checking…">
                Verify and continue
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full sm:w-auto"
                disabled={busy || cooldown > 0}
                loading={pending === "resend"}
                loadingText="Sending…"
                onClick={() => void sendCode(true)}
              >
                {cooldown > 0 ? (
                  <>
                    Resend code in <span className="tabular-nums">{cooldown}s</span>
                  </>
                ) : (
                  "Resend code"
                )}
              </Button>
            </>
          )}
        </div>
      </form>
    </section>
  );
}
