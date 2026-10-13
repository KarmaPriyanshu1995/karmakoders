import type { ReactNode } from "react";
import { SUPPORT_EMAIL, SUPPORT_EMAIL_HREF } from "@/platform/config/contact";

/** Full-width notice for signer pages (invalid link, not your turn, expired session). */
export function SignerNotice({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section aria-labelledby="signer-notice-title" className="space-y-4 py-8">
      <h1 id="signer-notice-title" className="text-2xl font-bold tracking-tight">
        {title}
      </h1>
      <div className="space-y-3 text-[#A39F97]">{children}</div>
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

export function SignerLinkInvalid() {
  return (
    <SignerNotice title="This link is no longer valid">
      <p>
        The signing link may have expired, been replaced, or the document may have been cancelled or already
        completed.
      </p>
      <p>If you still need to sign, ask the sender to send you a new link.</p>
    </SignerNotice>
  );
}

export function SignerNotYourTurn() {
  return (
    <SignerNotice title="It's not your turn yet">
      <p>This document is signed in order, and someone else signs before you.</p>
      <p>We&apos;ll email you when it&apos;s your turn to sign.</p>
    </SignerNotice>
  );
}

export function SignerSessionExpired() {
  return (
    <SignerNotice title="Your signing session has expired">
      <p>For your security, signing sessions end after a while or when the document changes.</p>
      <p>Reopen the link from your email to continue.</p>
    </SignerNotice>
  );
}
