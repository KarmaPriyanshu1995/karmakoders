import type { ReactNode } from "react";
import { SignerStateScreen } from "./screens/signer/signer-state-screen";

/**
 * Signer notices used by the 5B routes (invalid link, not your turn, expired session). Same
 * names and headings as before; the look comes from the signer state screen. Server-safe.
 */

/** A neutral notice with a custom title and body. */
export function SignerNotice({ title, children }: { title: string; children: ReactNode }) {
  return (
    <SignerStateScreen kind="invalid" title={title}>
      {children}
    </SignerStateScreen>
  );
}

export function SignerLinkInvalid() {
  return <SignerStateScreen kind="invalid" />;
}

export function SignerNotYourTurn() {
  return <SignerStateScreen kind="not-yet" />;
}

export function SignerSessionExpired() {
  return <SignerStateScreen kind="expired" />;
}
