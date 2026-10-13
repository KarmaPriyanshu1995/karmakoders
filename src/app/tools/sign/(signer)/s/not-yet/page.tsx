import { SignerNotYourTurn } from "@/modules/sign/ui/signer-notice";

/** Sequential signing: a valid link whose signer is not next in line. */
export default function SignerNotYetPage() {
  return <SignerNotYourTurn />;
}
