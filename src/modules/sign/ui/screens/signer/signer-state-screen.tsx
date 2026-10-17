import type { ReactNode } from "react";
import { Ban, CircleCheck, Clock, Link2Off, TimerOff, WifiOff, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { SUPPORT_EMAIL, SUPPORT_EMAIL_HREF } from "@/platform/config/contact";
import { TONES, type Tone } from "../../colors";
import type { SignerStateKind } from "../../signer-view-models";

/**
 * Full-page signer states: invalid link, not your turn, session expired, document voided while
 * signing, already signed and network error. Server-safe; an action (retry) is passed in.
 * The copy never says why a link is invalid (docs/AUTH.md, "Link token").
 */

type StateCopy = { title: string; body: string[]; icon: LucideIcon; tone: Tone };

export const SIGNER_STATE_COPY: Record<SignerStateKind, StateCopy> = {
  invalid: {
    title: "This link is no longer valid",
    body: [
      "The signing link may have expired, been replaced, or the document may have been cancelled or already completed.",
      "If you still need to sign, ask the sender to send you a new link.",
    ],
    icon: Link2Off,
    tone: "neutral",
  },
  "not-yet": {
    title: "It's not your turn yet",
    body: [
      "This document is signed in order, and someone else signs before you.",
      "We'll email you when it's your turn to sign.",
    ],
    icon: Clock,
    tone: "info",
  },
  expired: {
    title: "Your signing session has expired",
    body: [
      "For your security, signing sessions end after a while or when the document changes.",
      "Reopen the link from your email to continue.",
    ],
    icon: TimerOff,
    tone: "neutral",
  },
  voided: {
    title: "This document was cancelled",
    body: [
      "The sender cancelled this document while you were signing, so it can no longer be signed. Nothing you entered was saved.",
      "If you think this is a mistake, contact the sender.",
    ],
    icon: Ban,
    tone: "warning",
  },
  "already-signed": {
    title: "You've already signed this document",
    body: [
      "There's nothing more for you to do.",
      "You'll receive a copy by email when everyone has signed.",
    ],
    icon: CircleCheck,
    tone: "success",
  },
  network: {
    title: "We couldn't reach KarmaKoders Sign",
    body: ["Check your connection and try again. Anything you've already completed is kept on this page."],
    icon: WifiOff,
    tone: "danger",
  },
};

export function SignerStateScreen({
  kind,
  title,
  children,
  action,
  className,
}: {
  kind: SignerStateKind;
  /** Overrides the default heading. */
  title?: string;
  /** Overrides the default body paragraphs. */
  children?: ReactNode;
  /** E.g. a retry button for the network state. */
  action?: ReactNode;
  className?: string;
}) {
  const copy = SIGNER_STATE_COPY[kind];
  const Icon = copy.icon;
  return (
    <section
      aria-labelledby="signer-state-title"
      role={kind === "network" ? "alert" : undefined}
      data-signer-state={kind}
      className={cn("space-y-5 py-6", className)}
    >
      <span className={cn("flex size-12 items-center justify-center rounded-xl border", TONES[copy.tone].classes)}>
        <Icon aria-hidden className={cn("size-5", TONES[copy.tone].text)} />
      </span>
      <h1 id="signer-state-title" className="text-2xl font-black tracking-tight text-white">
        {title ?? copy.title}
      </h1>
      <div className="space-y-3 leading-relaxed text-[#A39F97]">
        {children ?? copy.body.map((p) => <p key={p}>{p}</p>)}
      </div>
      {action ? <div className="flex flex-wrap gap-3">{action}</div> : null}
      <p className="text-sm text-[#A39F97]">
        Need help? Email{" "}
        <a
          href={SUPPORT_EMAIL_HREF}
          className="rounded text-[#FFC300] underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFC300]"
        >
          {SUPPORT_EMAIL}
        </a>
        .
      </p>
    </section>
  );
}
