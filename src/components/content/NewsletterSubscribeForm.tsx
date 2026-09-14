"use client";

import { useId, useState } from "react";
import { Check, Send } from "lucide-react";
import { subscribeNewsletter } from "@/lib/actions";
import { toast } from "sonner";

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function subscribeButtonLabel(label?: string) {
  const value = (label || "Subscribe").trim();
  if (!value || value.length > 16) return "Subscribe";
  return value;
}

export function NewsletterSubscribeForm({
  submitLabel = "Subscribe",
}: {
  submitLabel?: string;
}) {
  const inputId = useId();
  const errorId = useId();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [subscribed, setSubscribed] = useState(false);
  const [pending, setPending] = useState(false);
  const buttonLabel = subscribeButtonLabel(submitLabel);

  async function handleSubscribe(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextEmail = email.trim();
    if (!isValidEmail(nextEmail)) {
      setError("Enter a valid email address.");
      return;
    }

    setError(null);
    setPending(true);
    try {
      await subscribeNewsletter(nextEmail);
      setSubscribed(true);
      setEmail("");
      toast.success("Subscribed successfully! Thank you.");
    } catch (subscribeError) {
      console.error(subscribeError);
      setError("Could not subscribe. Please try again.");
      toast.error("Failed to subscribe. Please try again.");
    } finally {
      setPending(false);
    }
  }

  if (subscribed) {
    return (
      <div
        className="flex items-center gap-3 rounded-2xl border border-[#FFC300]/20 bg-[#FFC300]/10 px-5 py-4 text-sm font-semibold text-[#FFC300]"
        role="status"
      >
        <Check className="h-4 w-4 shrink-0" aria-hidden="true" />
        You&apos;re subscribed. Thanks for following along.
      </div>
    );
  }

  return (
    <form onSubmit={(event) => void handleSubscribe(event)} noValidate className="w-full max-w-xl">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch sm:rounded-2xl sm:border sm:border-white/10 sm:bg-[#1C1B1A] sm:p-1.5 sm:focus-within:border-[#FFC300]/40">
        <label htmlFor={inputId} className="sr-only">
          Email address
        </label>
        <input
          id={inputId}
          type="email"
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            if (error) setError(null);
          }}
          placeholder="Enter your email"
          autoComplete="email"
          disabled={pending}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          className="h-12 min-w-0 flex-1 rounded-xl border border-white/10 bg-[#1C1B1A] px-4 text-sm text-white outline-none placeholder:text-slate-500 focus:border-[#FFC300]/50 sm:border-0 sm:bg-transparent sm:focus:border-transparent disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={pending}
          aria-label={submitLabel || "Subscribe for updates"}
          className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#FFC300] px-5 text-sm font-black text-[#1C1B1A] transition-all hover:bg-[#FFD60A] hover:shadow-[0_0_20px_rgba(255,195,0,0.25)] disabled:opacity-60"
        >
          {pending ? "Subscribing…" : buttonLabel}
          {!pending ? <Send className="h-4 w-4" aria-hidden="true" /> : null}
        </button>
      </div>
      {error ? (
        <p id={errorId} className="mt-2 text-sm text-rose-400" role="alert">
          {error}
        </p>
      ) : (
        <p className="mt-3 text-xs text-slate-500">No spam. Unsubscribe anytime.</p>
      )}
    </form>
  );
}

export function NewsletterCta({
  heading,
  body,
  submitLabel,
}: {
  heading: string;
  body: string;
  submitLabel?: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] p-8 md:p-10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,195,0,0.08),transparent_55%)]" />
      <div className="relative max-w-2xl">
        <p className="mb-3 text-xs font-bold uppercase tracking-widest text-[#FFC300]">Newsletter</p>
        <h3 className="text-2xl font-black tracking-tight text-white md:text-3xl">{heading}</h3>
        {body ? <p className="mt-3 leading-relaxed text-slate-400">{body}</p> : null}
        <div className="mt-6">
          <NewsletterSubscribeForm submitLabel={submitLabel} />
        </div>
      </div>
    </div>
  );
}
