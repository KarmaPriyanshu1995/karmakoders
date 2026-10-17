"use client";

import * as React from "react";
import { RotateCw } from "lucide-react";
import { Button } from "../../button";
import type { FieldValue, ReviewVM, SignerActionResult, SignerStateKind } from "../../signer-view-models";
import { ConsentScreen } from "./consent-screen";
import { DeclineScreen } from "./decline-flow";
import { DeclinedScreen, DoneScreen } from "./done-screen";
import { ReviewScreen } from "./review-screen";
import type { SignTab } from "./sign-dialog";
import { SignerShell } from "./signer-shell";
import { SignerStateScreen } from "./signer-state-screen";

/**
 * The signer's steps after the email code: consent → review (+ sign dialog) → done, with
 * decline available from consent and review. Step state lives in the browser; the server
 * state only changes through `actions` (TODO(Step 9): they call the signing APIs).
 */

export type SignerFlowStep = "consent" | "review" | "decline" | "done" | "declined";

export type SignerFlowActions = {
  consent: () => Promise<SignerActionResult>;
  finish: (values: Record<string, FieldValue>) => Promise<SignerActionResult>;
  decline: (reason: string) => Promise<SignerActionResult>;
};

export type SignerFlowPreview = {
  step?: SignerFlowStep;
  consentShowError?: boolean;
  reviewValues?: Record<string, FieldValue>;
  reviewDialog?: { kind: "signature" | "initials"; tab: SignTab; uploadError?: string } | null;
  declineReason?: string;
  declineShowError?: boolean;
  declineConfirmOpen?: boolean;
  state?: SignerStateKind;
};

export function SignerFlow({ vm, actions, preview = {} }: { vm: ReviewVM; actions: SignerFlowActions; preview?: SignerFlowPreview }) {
  const [step, setStep] = React.useState<SignerFlowStep>(preview.step ?? "consent");
  const [declineFrom, setDeclineFrom] = React.useState<"consent" | "review">("consent");
  const [state, setState] = React.useState<SignerStateKind | null>(preview.state ?? null);
  const firstRender = React.useRef(true);

  React.useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    // New step: start at the top and move focus to its heading for screen readers.
    window.scrollTo?.({ top: 0 });
    const heading = document.querySelector<HTMLElement>("#main h1");
    if (heading) {
      heading.tabIndex = -1;
      heading.focus({ preventScroll: true });
    }
  }, [step, state]);

  function handle(result: SignerActionResult, onOk: () => void): SignerActionResult {
    if (result.ok) onOk();
    else if (result.kind === "expired") setState("expired");
    return result;
  }

  function decline(from: "consent" | "review") {
    setDeclineFrom(from);
    setStep("decline");
  }

  const brand = vm.context.brand;

  if (state) {
    return (
      <SignerShell brand={brand}>
        <SignerStateScreen
          kind={state}
          action={
            state === "network" ? (
              <Button type="button" icon={<RotateCw />} onClick={() => setState(null)}>
                Try again
              </Button>
            ) : undefined
          }
        />
      </SignerShell>
    );
  }

  if (step === "review") {
    return (
      <SignerShell brand={brand} width="wide" reserveBottomBar={vm.pages.length > 0}>
        <ReviewScreen
          vm={vm}
          initialValues={preview.reviewValues}
          initialDialog={preview.reviewDialog ?? null}
          actions={{
            onFinish: async (values) => handle(await actions.finish(values), () => setStep("done")),
            onDecline: () => decline("review"),
          }}
        />
      </SignerShell>
    );
  }

  return (
    <SignerShell brand={brand}>
      {step === "consent" ? (
        <ConsentScreen
          context={vm.context}
          initialShowError={preview.consentShowError}
          onDecline={() => decline("consent")}
          onAgree={async () => {
            try {
              handle(await actions.consent(), () => setStep("review"));
            } catch {
              setState("network");
            }
          }}
        />
      ) : step === "decline" ? (
        <DeclineScreen
          context={vm.context}
          initialReason={preview.declineReason}
          initialShowError={preview.declineShowError}
          initialConfirmOpen={preview.declineConfirmOpen}
          onBack={() => setStep(declineFrom)}
          onDecline={async (reason) => handle(await actions.decline(reason), () => setStep("declined"))}
        />
      ) : step === "done" ? (
        <DoneScreen context={vm.context} />
      ) : (
        <DeclinedScreen context={vm.context} />
      )}
    </SignerShell>
  );
}
