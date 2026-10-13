import { SignerLinkInvalid } from "@/modules/sign/ui/signer-notice";

/** Target of the link exchange for every invalid, expired or used link (one generic page). */
export default function SignerLinkInvalidPage() {
  return <SignerLinkInvalid />;
}
