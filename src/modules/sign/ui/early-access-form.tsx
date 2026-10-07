"use client";

import { useActionState, useEffect, useId, useRef } from "react";
import { Button, Input, Label } from "@/components/product-ui";
import { joinEarlyAccess } from "@/modules/sign/early-access/actions";
// constants (not schema): keeps zod out of the client bundle.
import { EARLY_ACCESS_HONEYPOT_FIELD, EARLY_ACCESS_INITIAL_STATE } from "@/modules/sign/early-access/constants";

type EarlyAccessFormProps = {
  /** Recorded with the signup, e.g. "landing" or "template:mutual-nda". */
  source?: string;
};

export function EarlyAccessForm({ source = "landing" }: EarlyAccessFormProps) {
  const [state, formAction, pending] = useActionState(joinEarlyAccess, EARLY_ACCESS_INITIAL_STATE);
  const id = useId();
  const statusRef = useRef<HTMLParagraphElement>(null);
  const emailError = state.status === "error" && state.field === "email";

  useEffect(() => {
    if (state.status !== "idle") statusRef.current?.focus();
  }, [state]);

  if (state.status === "success") {
    return (
      <p
        ref={statusRef}
        tabIndex={-1}
        role="status"
        aria-live="polite"
        className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-emerald-100 outline-none"
      >
        {state.message}
      </p>
    );
  }

  return (
    <form action={formAction} className="grid max-w-xl gap-4" noValidate>
      <div className="space-y-1.5">
        <Label htmlFor={`${id}-email`}>Work email</Label>
        <Input
          id={`${id}-email`}
          name="email"
          type="email"
          autoComplete="email"
          required
          maxLength={254}
          placeholder="you@company.com"
          aria-invalid={emailError || undefined}
          aria-describedby={state.status === "error" ? `${id}-status` : undefined}
          disabled={pending}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor={`${id}-company`}>
            Company <span className="text-[#A39F97]">(optional)</span>
          </Label>
          <Input id={`${id}-company`} name="company" autoComplete="organization" maxLength={120} disabled={pending} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${id}-role`}>
            Role <span className="text-[#A39F97]">(optional)</span>
          </Label>
          <Input id={`${id}-role`} name="role" autoComplete="organization-title" maxLength={80} disabled={pending} />
        </div>
      </div>

      <input type="hidden" name="source" value={source} />
      {/* Honeypot: invisible to people and assistive tech; bots tend to fill it. */}
      <div aria-hidden="true" className="absolute -left-[10000px] h-px w-px overflow-hidden">
        <label htmlFor={`${id}-hp`}>Leave this field empty</label>
        <input id={`${id}-hp`} name={EARLY_ACCESS_HONEYPOT_FIELD} type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <div>
        <Button type="submit" disabled={pending} aria-disabled={pending}>
          {pending ? "Joining…" : "Get early access"}
        </Button>
      </div>

      <p
        id={`${id}-status`}
        ref={statusRef}
        tabIndex={-1}
        role={state.status === "error" ? "alert" : "status"}
        aria-live={state.status === "error" ? "assertive" : "polite"}
        className={`min-h-5 text-sm outline-none ${state.status === "error" ? "text-rose-300" : "text-[#A39F97]"}`}
      >
        {state.status === "error" ? state.message : pending ? "Submitting…" : ""}
      </p>
    </form>
  );
}
