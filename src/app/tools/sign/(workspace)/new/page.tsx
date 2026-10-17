import type { Metadata } from "next";
import { templatePickerVM } from "@/modules/sign/ui/screens/template-cards";
import { TemplatePickerScreen } from "@/modules/sign/ui/screens/template-picker-screen";
import { WORKSPACE_ROBOTS, loadWorkspace } from "../_lib/workspace";

export const metadata: Metadata = {
  title: "New document | KarmaKoders Sign",
  robots: WORKSPACE_ROBOTS,
};

/** Template picker: the canonical catalog plus the upload-your-own-PDF flow. */
export default async function SignNewDocumentPage() {
  await loadWorkspace("/tools/sign/new");
  return <TemplatePickerScreen vm={templatePickerVM()} />;
}
