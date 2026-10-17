import type { Metadata } from "next";
import { DOCUMENT_FIXTURES, listDocuments, manyDocuments } from "@/modules/sign/ui/fixtures/documents";
import { DocumentsListScreen } from "@/modules/sign/ui/screens/documents-list-screen";
import { parseDocumentsSearch } from "@/modules/sign/ui/screens/documents-search";
import { WORKSPACE_ROBOTS, loadWorkspace } from "../_lib/workspace";

export const metadata: Metadata = {
  title: "Documents | KarmaKoders Sign",
  robots: WORKSPACE_ROBOTS,
};

type PageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function SignDocumentsPage({ searchParams }: PageProps) {
  await loadWorkspace("/tools/sign/documents");
  const params = parseDocumentsSearch(await searchParams);
  // TODO(Step 7): listDocumentsForOwner with the same filter, search and cursor.
  const vm = listDocuments([...DOCUMENT_FIXTURES, ...manyDocuments(25)], {
    filter: params.status,
    period: params.period,
    query: params.q,
    cursor: params.cursor,
  });
  return <DocumentsListScreen vm={vm} />;
}
