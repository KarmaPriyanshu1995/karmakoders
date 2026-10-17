import { getCurrentSigner } from "@/modules/sign/signing/signer-session";
import { getSignerPageDetails } from "@/modules/sign/signing/signer-view";
import { SignerShell } from "@/modules/sign/ui/screens/signer/signer-shell";
import { SignerSessionExpired } from "@/modules/sign/ui/signer-notice";
import { SignerFlowLive } from "./signer-flow-live";
import { SignerOtpForm } from "./signer-otp-form";

/**
 * Signer home after the link exchange. Requires a valid signer session (re-checked against the
 * document state on every request). Step 1 is the email code; then consent, review and sign.
 * Only real data is shown: the document title, the sender, the masked email and the message.
 */
export default async function SignerHomePage() {
  const context = await getCurrentSigner();
  if (!context) {
    return (
      <SignerShell>
        <SignerSessionExpired />
      </SignerShell>
    );
  }

  const details = await getSignerPageDetails(context);

  if (!context.signer.otpVerifiedAt) {
    return (
      <SignerShell brand={details.brand}>
        <SignerOtpForm context={details} />
      </SignerShell>
    );
  }

  // TODO(Step 9): pages from the frozen document snapshot and this signer's fields. Until then
  // the review shows its safe "preview isn't available yet" state, never sample content.
  return <SignerFlowLive vm={{ context: details, pages: [], fields: [] }} />;
}
