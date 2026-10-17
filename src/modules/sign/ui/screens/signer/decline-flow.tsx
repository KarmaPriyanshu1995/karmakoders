"use client";

import * as React from "react";
import { DECLINE_REASON_MAX } from "@/modules/sign/signing/constants";
import { Alert } from "../../feedback";
import { Button } from "../../button";
import { ConfirmDialog } from "../../dialog";
import { FormField, Textarea } from "../../form";
import type { SignerActionResult, SignerContextVM } from "../../signer-view-models";

/**
 * Decline with a reason (PRD S8: required, max length enforced). Reason, then a confirmation
 * that states the consequences, then the declined screen (rendered by the flow).
 * TODO(Step 9): `onDecline` calls the decline API; until then it is a placeholder.
 */

export function DeclineScreen({
  context,
  onDecline,
  onBack,
  initialReason = "",
  initialShowError = false,
  initialConfirmOpen = false,
}: {
  context: SignerContextVM;
  onDecline: (reason: string) => Promise<SignerActionResult>;
  onBack: () => void;
  initialReason?: string;
  initialShowError?: boolean;
  initialConfirmOpen?: boolean;
}) {
  const id = React.useId();
  const [reason, setReason] = React.useState(initialReason);
  const [showError, setShowError] = React.useState(initialShowError);
  const [confirmOpen, setConfirmOpen] = React.useState(initialConfirmOpen);
  const [pending, setPending] = React.useState(false);
  const [failure, setFailure] = React.useState<string | null>(null);
  const reasonRef = React.useRef<HTMLTextAreaElement>(null);
  const counterId = `${id}-counter`;

  const trimmed = reason.trim();
  const error = showError && !trimmed ? "Tell the sender why you're declining." : undefined;

  function review(e: React.FormEvent) {
    e.preventDefault();
    if (!trimmed) {
      setShowError(true);
      reasonRef.current?.focus();
      return;
    }
    setConfirmOpen(true);
  }

  async function confirm() {
    setPending(true);
    setFailure(null);
    try {
      const result = await onDecline(trimmed);
      if (!result.ok) setFailure(result.message);
    } catch {
      setFailure("We couldn't reach KarmaKoders Sign. Check your connection and try again.");
    } finally {
      setPending(false);
      setConfirmOpen(false);
    }
  }

  return (
    <section aria-labelledby={`${id}-title`} className="space-y-6">
      <div className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-widest text-[#A39F97]">Decline</p>
        <h1 id={`${id}-title`} className="text-2xl font-black tracking-tight text-white">
          Decline to sign
        </h1>
        <p className="leading-relaxed text-[#A39F97]">
          {context.senderName ?? "The sender"} will see your reason. After you decline, you can&apos;t sign{" "}
          <span className="break-words text-white">{context.documentTitle}</span> with this link.
        </p>
      </div>

      {failure ? (
        <Alert tone="danger" title="We couldn't decline the document" live>
          {failure}
        </Alert>
      ) : null}

      <form noValidate onSubmit={review} className="space-y-5">
        <FormField label="Reason for declining" required error={error} hint="For example: the start date is wrong.">
          <Textarea
            ref={reasonRef}
            value={reason}
            maxLength={DECLINE_REASON_MAX}
            aria-describedby={counterId}
            onChange={(e) => setReason(e.target.value.slice(0, DECLINE_REASON_MAX))}
          />
        </FormField>
        <p id={counterId} className="-mt-3 text-right text-xs tabular-nums text-[#A39F97]">
          {reason.length} / {DECLINE_REASON_MAX} characters
        </p>
        <div className="flex flex-col gap-3 sm:flex-row-reverse sm:justify-end">
          <Button type="submit" variant="danger" size="lg" className="w-full sm:w-auto">
            Decline document
          </Button>
          <Button type="button" variant="secondary" size="lg" className="w-full sm:w-auto" onClick={onBack}>
            Go back
          </Button>
        </div>
      </form>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Decline this document?"
        consequences={
          <>
            <p>
              {context.senderName ?? "The sender"} will be told you declined, with your reason. This can&apos;t be
              undone: your link will stop working, and the document will need to be sent again.
            </p>
          </>
        }
        confirmLabel="Decline document"
        cancelLabel="Keep the document"
        loading={pending}
        loadingText="Declining…"
        onConfirm={confirm}
      />
    </section>
  );
}
