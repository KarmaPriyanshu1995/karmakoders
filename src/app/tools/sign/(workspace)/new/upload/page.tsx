import type { Metadata } from "next";
import { UPLOAD_PDF_MAX_BYTES } from "@/modules/sign/documents/upload-limits";
import { TEN_SIGNER_PEOPLE } from "@/modules/sign/ui/fixtures/documents";
import { UploadScreen } from "@/modules/sign/ui/screens/upload/upload-screen";
import { WORKSPACE_ROBOTS, loadWorkspace } from "../../_lib/workspace";

export const metadata: Metadata = {
  title: "Upload a PDF | KarmaKoders Sign",
  robots: WORKSPACE_ROBOTS,
};

/** Upload-your-own-PDF flow (separate from the template catalog by design). */
export default async function SignUploadPage() {
  await loadWorkspace("/tools/sign/new/upload");
  // TODO(Step 7): signers come from the signers step, and the file is uploaded encrypted to R2.
  const signers = TEN_SIGNER_PEOPLE.slice(0, 2).map((p, i) => ({ id: `s${i + 1}`, ...p }));
  return <UploadScreen vm={{ maxBytes: UPLOAD_PDF_MAX_BYTES, signers }} />;
}
