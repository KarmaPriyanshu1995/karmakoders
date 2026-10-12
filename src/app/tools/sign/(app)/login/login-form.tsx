"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Label } from "@/components/product-ui";

type Step = "email" | "code";

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

/** Two-step email OTP login. `next` is already validated server-side with safeNextPath. */
export function LoginForm({ next }: { next: string }) {
  const router = useRouter();
  const id = useId();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("");
  const [cooldown, setCooldown] = useState(0);
  const [pending, startTransition] = useTransition();
  const codeRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  useEffect(() => {
    if (step === "code") codeRef.current?.focus();
    else emailRef.current?.focus();
  }, [step]);

  function sendCode(isResend: boolean) {
    setError(null);
    setStatus(isResend ? "Sending a new code…" : "Sending your code…");
    startTransition(async () => {
      try {
        const res = await postJson("/api/platform/auth/otp/request", { email });
        if (!res.ok) {
          setStatus("");
          setError(res.error ?? GENERIC_ERROR);
          return;
        }
        setStep("code");
        setCode("");
        setCooldown(RESEND_COOLDOWN_SEC);
        setStatus(`We sent a 6-digit code to ${email}. It expires in 10 minutes.`);
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
        const res = await postJson("/api/platform/auth/otp/verify", { email, code });
        if (!res.ok) {
          setStatus("");
          setError(res.error ?? GENERIC_ERROR);
          codeRef.current?.select();
          return;
        }
        setStatus("Signed in. Redirecting…");
        router.replace(next);
        router.refresh();
      } catch {
        setStatus("");
        setError("Network error. Check your connection and try again.");
      }
    });
  }

  function switchEmail() {
    setStep("email");
    setCode("");
    setError(null);
    setStatus("");
    setCooldown(0);
  }

  const errorId = `${id}-error`;

  return (
    <form
      className="space-y-6"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        if (pending) return;
        if (step === "email") sendCode(false);
        else verify();
      }}
    >
      {step === "email" ? (
        <div className="space-y-2">
          <Label htmlFor={`${id}-email`}>Email</Label>
          <Input
            ref={emailRef}
            id={`${id}-email`}
            type="email"
            name="email"
            autoComplete="email"
            required
            maxLength={254}
            value={email}
            disabled={pending}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : `${id}-email-hint`}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
          />
          <p id={`${id}-email-hint`} className="text-sm text-[#A39F97]">
            We&apos;ll email you a 6-digit code to sign in.
          </p>
        </div>
      ) : (
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
          <p className="text-sm text-[#A39F97]">
            Sent to <span className="text-white">{email}</span>.{" "}
            <button
              type="button"
              onClick={switchEmail}
              disabled={pending}
              className="rounded text-[#FFC300] underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFC300]"
            >
              Use a different email
            </button>
          </p>
        </div>
      )}

      <p
        id={errorId}
        role="alert"
        aria-live="assertive"
        className="min-h-5 text-sm text-rose-300"
      >
        {error ?? ""}
      </p>
      <p role="status" aria-live="polite" className="sr-only">
        {status}
      </p>

      <div className="flex flex-wrap items-center gap-3">
        {step === "email" ? (
          <Button type="submit" disabled={pending || email.trim().length === 0}>
            {pending ? "Sending…" : "Send code"}
          </Button>
        ) : (
          <>
            <Button type="submit" disabled={pending || code.length !== 6}>
              {pending ? "Checking…" : "Sign in"}
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
