import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { findDocumentDetail } from "@/modules/sign/ui/fixtures/details";
import { DocumentDetailScreen } from "@/modules/sign/ui/screens/document-detail-screen";
import { WORKSPACE_ROBOTS, loadWorkspace } from "../../_lib/workspace";

export const metadata: Metadata = {
  title: "Document | KarmaKoders Sign",
  robots: WORKSPACE_ROBOTS,
};

type PageProps = { params: Promise<{ id: string }> };

export default async function SignDocumentPage({ params }: PageProps) {
  const { id } = await params;
  await loadWorkspace(`/tools/sign/documents/${encodeURIComponent(id)}`);
  // TODO(Step 7): getDocumentForOwner (404 for other customers' documents). TODO(Step 9): audit events.
  const vm = findDocumentDetail(id);
  if (!vm) notFound();
  return <DocumentDetailScreen vm={vm} />;
}
