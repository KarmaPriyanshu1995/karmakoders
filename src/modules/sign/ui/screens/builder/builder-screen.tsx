"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "../../button";
import { Stepper } from "../../display";
import { Alert } from "../../feedback";
import type { BuilderVM } from "../../view-models";
import { PageHeader, TEXT_LINK } from "../parts";
import { comingSoon } from "../placeholder-actions";
import {
  BUILDER_STEPS,
  builderReducer,
  initialBuilderState,
  validateDetails,
  validateSigners,
  type BuilderState,
  type BuilderStep,
} from "./builder-state";
import { DetailsStep, SaveIndicator, type SaveState } from "./details-step";
import { ReviewStep } from "./review-step";
import { SignersStep } from "./signers-step";

/**
 * Three-step document builder: details (with live preview), signers, review & send.
 * TODO(Step 7): load and autosave the draft; TODO(Step 9): send for signature.
 */
export function BuilderScreen({
  vm,
  initialState,
  initialSaveState = "idle",
  initialShowErrors = false,
}: {
  vm: BuilderVM;
  /** Preview and tests: start on a step or with filled-in values. */
  initialState?: Partial<BuilderState>;
  initialSaveState?: SaveState;
  /** Preview and tests: show validation as if Continue was pressed. */
  initialShowErrors?: boolean;
}) {
  const { template, plan } = vm;
  const [state, dispatch] = React.useReducer(builderReducer, undefined, () => ({
    ...initialBuilderState(template, { defaultExpiryDays: vm.defaultExpiryDays, maxSigners: plan.maxSigners }),
    ...initialState,
  }));
  const [showErrors, setShowErrors] = React.useState<{ details: boolean; signers: boolean }>({
    details: initialShowErrors,
    signers: initialShowErrors,
  });
  const [confirmError, setConfirmError] = React.useState<string | null>(null);
  const [saveState, setSaveState] = React.useState<SaveState>(initialSaveState);
  const headingRef = React.useRef<HTMLHeadingElement>(null);
  const firstRender = React.useRef(true);

  const detailErrors = validateDetails(template.fields, state.values);
  const signerValidation = validateSigners(state.signers, plan.maxSigners);

  // Simulated autosave on every edit (no network yet).
  const { values, signers, mode, message, expiryDays, reminders } = state;
  React.useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    setSaveState("saving");
    const timer = setTimeout(() => setSaveState("saved"), 700);
    return () => clearTimeout(timer);
  }, [values, signers, mode, message, expiryDays, reminders]);

  function goTo(step: BuilderStep) {
    dispatch({ type: "set_step", step });
    requestAnimationFrame(() => headingRef.current?.focus());
  }

  function next() {
    if (state.step === 0) {
      if (Object.keys(detailErrors).length > 0) {
        setShowErrors((s) => ({ ...s, details: true }));
        return;
      }
      goTo(1);
    } else if (state.step === 1) {
      if (!signerValidation.valid) {
        setShowErrors((s) => ({ ...s, signers: true }));
        return;
      }
      goTo(2);
    }
  }

  function send() {
    if (!state.confirmEligible) {
      setConfirmError("Confirm the document can be signed electronically before sending.");
      return;
    }
    comingSoon("Sending for signature");
  }

  const stepTitle = BUILDER_STEPS[state.step];
  const errorCount =
    state.step === 0 && showErrors.details
      ? Object.keys(detailErrors).length
      : state.step === 1 && showErrors.signers
        ? Object.keys(signerValidation.errors).length + (signerValidation.limitError ? 1 : 0)
        : 0;

  return (
    <div className="space-y-8">
      <Link href="/tools/sign/new" className={`${TEXT_LINK} inline-flex min-h-11 items-center gap-1 text-sm`}>
        <ArrowLeft aria-hidden className="size-4" />
        All templates
      </Link>
      <PageHeader eyebrow="New document" title={template.name} actions={<SaveIndicator state={saveState} />} />
      <Stepper steps={[...BUILDER_STEPS]} current={state.step} />

      <h2 ref={headingRef} tabIndex={-1} className="sr-only focus:outline-none">
        Step {state.step + 1} of {BUILDER_STEPS.length}: {stepTitle}
      </h2>

      {errorCount > 0 ? (
        <Alert tone="danger" live title={errorCount === 1 ? "Fix 1 problem to continue" : `Fix ${errorCount} problems to continue`}>
          The fields that need attention are marked below.
        </Alert>
      ) : null}

      {state.step === 0 ? (
        <DetailsStep
          template={template}
          values={state.values}
          signers={state.signers}
          errors={showErrors.details ? detailErrors : {}}
          onChange={(key, value) => dispatch({ type: "set_value", key, value })}
        />
      ) : state.step === 1 ? (
        <SignersStep
          state={state}
          roles={template.signerRoles}
          plan={plan}
          validation={signerValidation}
          showErrors={showErrors.signers}
          dispatch={dispatch}
        />
      ) : (
        <ReviewStep
          template={template}
          plan={plan}
          state={state}
          confirmError={confirmError}
          onConfirmChange={(on) => {
            dispatch({ type: "set_confirm", on });
            if (on) setConfirmError(null);
          }}
          onSend={send}
        />
      )}

      <div className="flex flex-wrap justify-between gap-3 border-t border-white/10 pt-6">
        {state.step > 0 ? (
          <Button variant="secondary" icon={<ArrowLeft />} onClick={() => goTo((state.step - 1) as BuilderStep)}>
            Back
          </Button>
        ) : (
          <span />
        )}
        {state.step < 2 ? (
          <Button onClick={next}>
            Continue to {BUILDER_STEPS[state.step + 1].toLowerCase()}
            <ArrowRight aria-hidden />
          </Button>
        ) : null}
      </div>
    </div>
  );
}
