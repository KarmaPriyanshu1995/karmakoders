"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Label } from "@/components/product-ui";

type Step = "send" | "code";

const RESEND_COOLDOWN_SEC = 60;
const GENERIC_ERROR = "Something went wrong. Please try again.";

async function postJson(url: string, body: unknown): Promise<{ ok: boolean; status: number; error?: string }> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    credentials: "same-origin",
  });
  const data = (await res.json().catch(() => ({}))) as { error?: string };
  return { ok: res.ok, status: res.status, error: data.error };
}

/**
 * Signer email OTP. The address comes from the signer session on the server — there is no
 * email field, so the signer can't change where the code goes.
 */
export function SignerOtpForm() {
  const router = useRouter();
  const id = useId();
  const [step, setStep] = useState<Step>("send");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [pending, startTransition] = useTransition();
  const codeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  useEffect(() => {
    if (step === "code") codeRef.current?.focus();
  }, [step]);

  function handleFailure(res: { status: number; error?: string }) {
    setStatus("");
    // 401: the signer session ended (expired, or the document changed) → show the expired page.
    if (res.status === 401) {
      router.refresh();
      return;
    }
    setError(res.error ?? GENERIC_ERROR);
  }

  function sendCode(isResend: boolean) {
    setError(null);
    setStatus(isResend ? "Sending a new code…" : "Sending your code…");
    startTransition(async () => {
      try {
        const res = await postJson("/api/tools/sign/signing/otp/request", {});
        if (!res.ok) return handleFailure(res);
        setStep("code");
        setCode("");
        setCooldown(RESEND_COOLDOWN_SEC);
        setStatus("We sent a 6-digit code to your email. It expires in 10 minutes.");
      } catch {
        setStatus("");
        setError("Network error. Check your connection and try again.");
      }
    });
  }

  function verify() {
    setError(null);
    setStatus("Checking your code…");
    startTransition(async () => {
      try {
        const res = await postJson("/api/tools/sign/signing/otp/verify", { code });
        if (!res.ok) {
          handleFailure(res);
          codeRef.current?.select();
          return;
        }
        setStatus("Verified.");
        router.refresh();
      } catch {
        setStatus("");
        setError("Network error. Check your connection and try again.");
      }
    });
  }

  const errorId = `${id}-error`;

  return (
    <form
      className="space-y-6"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        if (pending) return;
        if (step === "send") sendCode(false);
        else verify();
      }}
    >
      {step === "code" && (
        <div className="space-y-2">
          <Label htmlFor={`${id}-code`}>6-digit code</Label>
          <Input
            ref={codeRef}
            id={`${id}-code`}
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            maxLength={6}
            required
            value={code}
            disabled={pending}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            // Strip spaces/dashes so pasting "123 456" or "123-456" works.
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="000000"
            className="font-mono text-lg tracking-[0.4em]"
          />
        </div>
      )}

      <p id={errorId} role="alert" aria-live="assertive" className="min-h-5 text-sm text-rose-300">
        {error ?? ""}
      </p>
      <p role="status" aria-live="polite" className={step === "code" ? "text-sm text-[#A39F97]" : "sr-only"}>
        {status}
      </p>

      <div className="flex flex-wrap items-center gap-3">
        {step === "send" ? (
          <Button type="submit" disabled={pending}>
            {pending ? "Sending…" : "Email me a code"}
          </Button>
        ) : (
          <>
            <Button type="submit" disabled={pending || code.length !== 6}>
              {pending ? "Checking…" : "Verify"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled={pending || cooldown > 0}
              aria-disabled={pending || cooldown > 0}
              onClick={() => sendCode(true)}
            >
              {cooldown > 0 ? `Resend code (${cooldown}s)` : "Resend code"}
            </Button>
          </>
        )}
      </div>
    </form>
  );
}
