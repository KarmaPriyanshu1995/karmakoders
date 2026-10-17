import type { Metadata } from "next";
import { UPLOAD_PDF_MAX_BYTES } from "@/modules/sign/documents/upload-limits";
import { UploadScreen } from "@/modules/sign/ui/screens/upload/upload-screen";
import { WORKSPACE_ROBOTS, loadWorkspace } from "../../_lib/workspace";

export const metadata: Metadata = {
  title: "Upload a PDF | KarmaKoders Sign",
  robots: WORKSPACE_ROBOTS,
};

/** Upload-your-own-PDF flow (separate from the template catalog by design). */
export default async function SignUploadPage() {
  const { profile } = await loadWorkspace("/tools/sign/new/upload");
  // TODO(Step 7): signers come from a signers step and the file is uploaded encrypted to R2.
  // Until then the sender is the only signer fields can be placed for.
  const signers = [{ id: "me", name: profile.name ?? "You", email: profile.email }];
  return <UploadScreen vm={{ maxBytes: UPLOAD_PDF_MAX_BYTES, signers }} />;
}
