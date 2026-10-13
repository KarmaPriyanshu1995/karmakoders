import { maskEmail } from "@/platform/logger";
import { getCurrentSigner } from "@/modules/sign/signing/signer-session";
import { SignerNotice, SignerSessionExpired } from "@/modules/sign/ui/signer-notice";
import { SignerOtpForm } from "./signer-otp-form";

/**
 * Signer home after the link exchange. Requires a valid signer session (re-checked against the
 * document state on every request). Step 1 is email OTP; the review / consent / signature
 * screens come in a later step.
 */
export default async function SignerHomePage() {
  const context = await getCurrentSigner();
  if (!context) return <SignerSessionExpired />;

  const { signer, document } = context;

  if (!signer.otpVerifiedAt) {
    return (
      <section aria-labelledby="signer-otp-title" className="space-y-6 py-8">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#FFC300]">Confirm it&apos;s you</p>
          <h1 id="signer-otp-title" className="text-2xl font-bold tracking-tight">
            {document.title}
          </h1>
          <p className="text-[#A39F97]">
            Before you can review and sign, we&apos;ll email a 6-digit code to{" "}
            <span className="text-white">{maskEmail(signer.email)}</span>.
          </p>
        </div>
        <SignerOtpForm />
      </section>
    );
  }

  return (
    <SignerNotice title="Verified – document review coming soon">
      <p>
        Thanks, your email is confirmed for <span className="text-white">{document.title}</span>.
      </p>
      <p>Reviewing and signing documents online is coming soon.</p>
    </SignerNotice>
  );
}
