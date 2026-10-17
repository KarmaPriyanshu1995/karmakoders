"use client";

import type { ReviewVM, SignerActionResult } from "@/modules/sign/ui/signer-view-models";
import { SignerFlow, type SignerFlowActions } from "@/modules/sign/ui/screens/signer/signer-flow";

const NOT_YET: SignerActionResult = {
  ok: false,
  kind: "error",
  message: "Signing online isn't available yet. Nothing was changed.",
};

/**
 * Real-route actions for the signer steps after the email code. Placeholders until the signing
 * APIs exist: nothing is recorded and no document state changes.
 */
const PLACEHOLDER_ACTIONS: SignerFlowActions = {
  // TODO(Step 9): POST consent (consentAt + CONSENTED audit event). Moves on in the browser only.
  consent: async () => ({ ok: true }),
  // TODO(Step 9): POST the field values and signature (SIGNED audit event, document status).
  finish: async () => NOT_YET,
  // TODO(Step 9): POST the decline reason (DECLINED audit event, document status, notifications).
  decline: async () => ({ ...NOT_YET, message: "Declining online isn't available yet. Nothing was changed." }),
};

export function SignerFlowLive({ vm }: { vm: ReviewVM }) {
  return <SignerFlow vm={vm} actions={PLACEHOLDER_ACTIONS} />;
}
