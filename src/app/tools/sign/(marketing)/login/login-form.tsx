"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Label } from "@/components/product-ui";

type Step = "email" | "code";

export function LoginForm() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function requestCode() {
    setError(null);
    setInfo(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/platform/auth/otp/request", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });
        const data = (await res.json()) as { error?: string; ok?: boolean };
        if (!res.ok) {
          setError(data.error ?? "Could not send code");
          return;
        }
        setInfo("Check your email for a 6-digit code.");
        setStep("code");
      } catch {
        setError("Network error. Try again.");
      }
    });
  }

  function verifyCode() {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/platform/auth/otp/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, code }),
        });
        const data = (await res.json()) as { error?: string; ok?: boolean };
        if (!res.ok) {
          setError(data.error ?? "Could not verify code");
          return;
        }
        router.replace("/tools/sign/dashboard");
        router.refresh();
      } catch {
        setError("Network error. Try again.");
      }
    });
  }

  return (
    <form
      className="space-y-6 max-w-md"
      onSubmit={(e) => {
        e.preventDefault();
        if (step === "email") requestCode();
        else verifyCode();
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="email">Work email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          disabled={pending || step === "code"}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@company.com"
        />
      </div>

      {step === "code" ? (
        <div className="space-y-2">
          <Label htmlFor="code">Verification code</Label>
          <Input
            id="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            maxLength={6}
            required
            value={code}
            disabled={pending}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="000000"
          />
        </div>
      ) : null}

      {error ? <p className="text-sm text-rose-400">{error}</p> : null}
      {info ? <p className="text-sm text-[#A39F97]">{info}</p> : null}

      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Please wait…" : step === "email" ? "Email me a code" : "Verify & continue"}
        </Button>
        {step === "code" ? (
          <Button
            type="button"
            variant="ghost"
            disabled={pending}
            onClick={() => {
              setStep("email");
              setCode("");
              setInfo(null);
              setError(null);
            }}
          >
            Use a different email
          </Button>
        ) : null}
      </div>
    </form>
  );
}
