import type { ReactNode } from "react";
import { CircleCheck, CircleX, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { TONES } from "../../colors";
import type { SignerContextVM } from "../../signer-view-models";

/**
 * After signing or declining. No account prompt: signers never need one (PRD S7).
 * Server-safe.
 */

export const DONE_COPY_LINE = "You'll receive a copy by email when everyone has signed.";

function Outcome({
  tone,
  icon: Icon,
  title,
  children,
}: {
  tone: "success" | "danger";
  icon: LucideIcon;
  title: string;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby="signer-outcome-title" className="space-y-5 py-6">
      <span className={cn("flex size-14 items-center justify-center rounded-2xl border", TONES[tone].classes)}>
        <Icon aria-hidden className={cn("size-7", TONES[tone].text)} />
      </span>
      <h1 id="signer-outcome-title" tabIndex={-1} className="text-2xl font-black tracking-tight text-white focus:outline-none">
        {title}
      </h1>
      <div className="space-y-3 leading-relaxed text-[#A39F97]">{children}</div>
      <p className="text-sm text-[#A39F97]">You can close this page.</p>
    </section>
  );
}

export function DoneScreen({ context }: { context: SignerContextVM }) {
  return (
    <Outcome tone="success" icon={CircleCheck} title="You've signed the document">
      <p>
        Thanks. Your signature on <span className="break-words text-white">{context.documentTitle}</span> is recorded.
      </p>
      <p>{DONE_COPY_LINE}</p>
    </Outcome>
  );
}

export function DeclinedScreen({ context }: { context: SignerContextVM }) {
  return (
    <Outcome tone="danger" icon={CircleX} title="You declined to sign">
      <p>
        We&apos;ve let {context.senderName ?? "the sender"} know that you declined{" "}
        <span className="break-words text-white">{context.documentTitle}</span>, along with your reason.
      </p>
      <p>Your signing link no longer works. If you change your mind, ask the sender to send the document again.</p>
    </Outcome>
  );
}
