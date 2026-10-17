"use client";

import { RotateCw } from "lucide-react";
import { Button } from "@/modules/sign/ui/button";
import { notify } from "@/modules/sign/ui/toast";
import type { ReviewVM, SignerActionResult, SignerContextVM, SignerStateKind } from "@/modules/sign/ui/signer-view-models";
import { SignerFlow, type SignerFlowPreview } from "@/modules/sign/ui/screens/signer/signer-flow";
import { SignerShell } from "@/modules/sign/ui/screens/signer/signer-shell";
import { SignerStateScreen } from "@/modules/sign/ui/screens/signer/signer-state-screen";
import { VerifyEmailScreen } from "@/modules/sign/ui/screens/signer/verify-email-screen";

/**
 * Dev preview only (/tools/sign/dev/screens): signer screens with fake actions that succeed
 * after a short delay. Nothing is sent anywhere. The server registry can't pass functions to
 * client screens, so these wrappers create them here.
 */

const ok = (): Promise<SignerActionResult> => new Promise((resolve) => setTimeout(() => resolve({ ok: true }), 600));

export function PreviewVerify({
  context,
  step,
  code,
  error,
  cooldown,
}: {
  context: SignerContextVM;
  step: "send" | "code";
  code?: string;
  error?: string;
  cooldown?: number;
}) {
  return (
    <SignerShell brand={context.brand}>
      <VerifyEmailScreen
        context={context}
        initialStep={step}
        initialCode={code}
        initialError={error ?? null}
        initialCooldown={cooldown}
        actions={{
          requestCode: ok,
          verifyCode: ok,
          onSessionExpired: () => notify.info("Preview: the session would end here"),
          onVerified: () => notify.success("Preview: verified", { description: "The real page moves on to consent." }),
        }}
      />
    </SignerShell>
  );
}

export function PreviewFlow({ vm, preview }: { vm: ReviewVM; preview?: SignerFlowPreview }) {
  return <SignerFlow vm={vm} preview={preview} actions={{ consent: ok, finish: ok, decline: ok }} />;
}

export function PreviewState({ kind, context }: { kind: SignerStateKind; context: SignerContextVM | null }) {
  return (
    <SignerShell brand={context?.brand ?? null}>
      <SignerStateScreen
        kind={kind}
        action={
          kind === "network" ? (
            <Button type="button" icon={<RotateCw />} onClick={() => notify.info("Preview: this retries the last step")}>
              Try again
            </Button>
          ) : undefined
        }
      />
    </SignerShell>
  );
}
