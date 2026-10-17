import type { Metadata } from "next";
import { DocumentsListScreen } from "@/modules/sign/ui/screens/documents-list-screen";
import { parseDocumentsSearch } from "@/modules/sign/ui/screens/documents-search";
import { emptyDocumentsList } from "@/modules/sign/ui/screens/empty-view-models";
import { WORKSPACE_ROBOTS, loadWorkspace } from "../_lib/workspace";

export const metadata: Metadata = {
  title: "Documents | KarmaKoders Sign",
  robots: WORKSPACE_ROBOTS,
};

type PageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

/** TODO(Step 7): listDocumentsForOwner with the parsed filter, search and cursor. Empty until then. */
export default async function SignDocumentsPage({ searchParams }: PageProps) {
  await loadWorkspace("/tools/sign/documents");
  const search = parseDocumentsSearch(await searchParams);
  return <DocumentsListScreen vm={emptyDocumentsList(search)} />;
}
