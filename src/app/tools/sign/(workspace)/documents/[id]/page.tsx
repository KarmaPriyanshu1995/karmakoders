import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { WORKSPACE_ROBOTS, loadWorkspace } from "../../_lib/workspace";

export const metadata: Metadata = {
  title: "Document | KarmaKoders Sign",
  robots: WORKSPACE_ROBOTS,
};

type PageProps = { params: Promise<{ id: string }> };

/**
 * Documents aren't wired yet, so every id is "not found" (the same answer an unknown or
 * another customer's document will get).
 * TODO(Step 7): getDocumentForOwner → DocumentDetailScreen; TODO(Step 9): activity from the audit trail.
 */
export default async function SignDocumentPage({ params }: PageProps) {
  const { id } = await params;
  await loadWorkspace(`/tools/sign/documents/${encodeURIComponent(id)}`);
  notFound();
}
