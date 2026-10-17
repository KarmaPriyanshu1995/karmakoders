"use client";

import { useRouter } from "next/navigation";
import type { SignerActionResult, SignerContextVM } from "@/modules/sign/ui/signer-view-models";
import { VerifyEmailScreen, type VerifyEmailActions } from "@/modules/sign/ui/screens/signer/verify-email-screen";

const GENERIC_ERROR = "Something went wrong. Please try again.";

/** POSTs same-origin JSON. A thrown fetch (offline) surfaces as a network error in the screen. */
async function postJson(url: string, body: unknown): Promise<SignerActionResult> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    credentials: "same-origin",
  });
  if (res.ok) return { ok: true };
  const data = (await res.json().catch(() => ({}))) as { error?: string };
  // 401: the signer session ended (expired, or the document changed).
  if (res.status === 401) return { ok: false, kind: "expired", message: data.error ?? GENERIC_ERROR };
  return { ok: false, kind: "error", message: data.error ?? GENERIC_ERROR };
}

/**
 * Live actions for the signer email-code step. The address comes from the signer session on the
 * server: the request body carries no email, so the signer can't change where the code goes.
 * On success or an ended session the page re-renders on the server (router.refresh).
 */
export function SignerOtpForm({ context }: { context: SignerContextVM }) {
  const router = useRouter();
  const actions: VerifyEmailActions = {
    requestCode: () => postJson("/api/tools/sign/signing/otp/request", {}),
    verifyCode: (code) => postJson("/api/tools/sign/signing/otp/verify", { code }),
    onSessionExpired: () => router.refresh(),
    onVerified: () => router.refresh(),
  };
  return <VerifyEmailScreen context={context} actions={actions} />;
}
