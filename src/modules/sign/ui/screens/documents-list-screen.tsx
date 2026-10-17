import Link from "next/link";
import { ChevronLeft, ChevronRight, FilePlus2, Inbox, Search, SearchX } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "../button";
import { EmptyState, Skeleton } from "../feedback";
import { Input } from "../form";
import type { DocumentFilter, DocumentRowVM, DocumentsListVM } from "../view-models";
import { DOCUMENT_FILTERS } from "../view-models";
import { DocumentRowActions } from "./document-row-actions";
import { formatDate } from "./format";
import { DocumentStatus, PageHeader, documentHref } from "./parts";

export const FILTER_LABELS: Record<DocumentFilter, string> = {
  all: "All",
  waiting: "Waiting",
  in_progress: "In progress",
  completed: "Completed",
  draft: "Drafts",
  closed: "Declined, expired or voided",
};

const BASE = "/tools/sign/documents";

export function documentsListHref(params: {
  filter?: DocumentFilter;
  period?: "month" | null;
  query?: string;
  cursor?: string | null;
}): string {
  const search = new URLSearchParams();
  if (params.filter && params.filter !== "all") search.set("status", params.filter);
  if (params.period && params.filter === "completed") search.set("period", params.period);
  if (params.query) search.set("q", params.query);
  if (params.cursor) search.set("cursor", params.cursor);
  const qs = search.toString();
  return qs ? `${BASE}?${qs}` : BASE;
}

function signerSummary(doc: DocumentRowVM): string {
  const [first] = doc.signers;
  if (!first) return "No signers yet";
  return doc.signers.length === 1 ? first.name : `${first.name} and ${doc.signers.length - 1} more`;
}

const FOCUS = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFC300] focus-visible:ring-offset-2 focus-visible:ring-offset-[#252422]";

function FilterTabs({ vm }: { vm: DocumentsListVM }) {
  return (
    // relative: the sr-only count labels are position:absolute; without a positioned ancestor here
    // they escape the scroll container and widen the page on phones.
    <nav aria-label="Filter by status" className="relative -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <ul className="inline-flex min-w-max gap-1 rounded-xl border border-white/10 bg-[#1C1B1A] p-1">
        {DOCUMENT_FILTERS.map((filter) => {
          const active = vm.filter === filter;
          return (
            <li key={filter}>
              <Link
                href={documentsListHref({ filter, query: vm.query })}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex min-h-11 items-center gap-2 rounded-lg px-4 text-sm font-semibold transition-colors motion-reduce:transition-none",
                  FOCUS,
                  active ? "bg-[#FFC300] text-[#1C1B1A]" : "text-white hover:bg-white/10"
                )}
              >
                {FILTER_LABELS[filter]}
                <span className={cn("text-xs", active ? "text-[#1C1B1A]" : "text-[#A39F97]")}>
                  <span className="sr-only">(</span>
                  {vm.counts[filter]}
                  <span className="sr-only"> documents)</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function SearchForm({ vm }: { vm: DocumentsListVM }) {
  return (
    <form role="search" action={BASE} method="get" className="flex gap-2">
      {vm.filter !== "all" ? <input type="hidden" name="status" value={vm.filter} /> : null}
      <label htmlFor="documents-search" className="sr-only">
        Search by title or signer email
      </label>
      <Input
        id="documents-search"
        type="search"
        name="q"
        defaultValue={vm.query}
        placeholder="Search by title or signer email"
        className="h-11 max-w-md"
      />
      <Button type="submit" variant="secondary" icon={<Search />}>
        Search
      </Button>
    </form>
  );
}

function DocumentsTable({ rows }: { rows: DocumentRowVM[] }) {
  return (
    <div className="hidden overflow-hidden rounded-2xl border border-white/10 md:block">
      <table className="hidden w-full table-fixed text-left text-sm md:table">
        <caption className="sr-only">Documents</caption>
        <thead className="bg-[#1C1B1A] text-xs font-bold uppercase tracking-widest text-[#A39F97]">
          <tr>
            <th scope="col" className="w-[38%] px-4 py-3">Document</th>
            <th scope="col" className="w-[22%] px-4 py-3">Status</th>
            <th scope="col" className="w-[18%] px-4 py-3">Signers</th>
            <th scope="col" className="w-[16%] px-4 py-3">Last activity</th>
            <th scope="col" className="w-[6%] px-4 py-3">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/10">
          {rows.map((doc) => (
            <tr key={doc.id} className="bg-white/[0.02] align-top">
              <td className="px-4 py-3">
                <Link href={documentHref(doc.id)} className={cn("block break-words rounded font-semibold text-white hover:text-[#FFC300]", FOCUS)}>
                  {doc.title}
                </Link>
                <span className="text-[#A39F97]">{doc.templateName}</span>
              </td>
              <td className="px-4 py-3">
                <DocumentStatus doc={doc} />
              </td>
              <td className="break-words px-4 py-3 text-[#A39F97]">{signerSummary(doc)}</td>
              <td className="px-4 py-3 text-[#A39F97]">
                <span className="block break-words text-white">{doc.lastActivity.label}</span>
                {formatDate(doc.lastActivity.at)}
              </td>
              <td className="px-2 py-1.5 text-right">
                <DocumentRowActions doc={doc} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DocumentCards({ rows }: { rows: DocumentRowVM[] }) {
  return (
    <ul className="space-y-3 md:hidden">
      {rows.map((doc) => (
        <li key={doc.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-start justify-between gap-2">
            <Link href={documentHref(doc.id)} className={cn("min-w-0 break-words rounded font-semibold text-white", FOCUS)}>
              {doc.title}
            </Link>
            <DocumentRowActions doc={doc} />
          </div>
          <div className="mt-2 space-y-2 text-sm text-[#A39F97]">
            <DocumentStatus doc={doc} />
            <p className="break-words">{signerSummary(doc)}</p>
            <p>
              {doc.lastActivity.label} · {formatDate(doc.lastActivity.at)}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}

function Pagination({ vm }: { vm: DocumentsListVM }) {
  const { prevCursor, nextCursor } = vm.page;
  if (!prevCursor && !nextCursor) return null;
  const common = { filter: vm.filter, period: vm.period, query: vm.query };
  return (
    <nav aria-label="Pagination" className="flex justify-between gap-3">
      {prevCursor ? (
        <Button asChild variant="secondary">
          <Link href={documentsListHref({ ...common, cursor: prevCursor })} rel="prev">
            <ChevronLeft aria-hidden />
            Previous
          </Link>
        </Button>
      ) : (
        <span />
      )}
      {nextCursor ? (
        <Button asChild variant="secondary">
          <Link href={documentsListHref({ ...common, cursor: nextCursor })} rel="next">
            Next
            <ChevronRight aria-hidden />
          </Link>
        </Button>
      ) : null}
    </nav>
  );
}

export function DocumentsListScreen({ vm }: { vm: DocumentsListVM }) {
  const newDocument = (
    <Button asChild>
      <Link href="/tools/sign/new">
        <FilePlus2 aria-hidden />
        New document
      </Link>
    </Button>
  );

  if (!vm.hasAnyDocuments) {
    return (
      <div className="space-y-8">
        <PageHeader title="Documents" />
        <EmptyState
          icon={Inbox}
          title="No documents yet"
          description="Documents you create and send appear here, with who has signed and what happens next."
          action={newDocument}
        />
      </div>
    );
  }

  const subtitle =
    vm.filter === "completed" && vm.period === "month" ? "Completed this month" : vm.filter === "all" ? null : FILTER_LABELS[vm.filter];

  return (
    <div className="space-y-6">
      <PageHeader title="Documents" description={subtitle ?? undefined} />
      <FilterTabs vm={vm} />
      <SearchForm vm={vm} />
      {vm.rows.length === 0 ? (
        <EmptyState
          icon={SearchX}
          title="No documents match"
          description={
            vm.query
              ? `Nothing matches "${vm.query}" here. Check the spelling, search by a signer's full email, or try another status.`
              : "No documents have this status yet."
          }
          action={
            <Button asChild variant="secondary">
              <Link href={BASE}>Show all documents</Link>
            </Button>
          }
        />
      ) : (
        <>
          <DocumentsTable rows={vm.rows} />
          <DocumentCards rows={vm.rows} />
          <Pagination vm={vm} />
        </>
      )}
    </div>
  );
}

/** Loading state for the documents list (route loading.tsx and the dev preview). */
export function DocumentsListSkeleton() {
  return (
    <div className="space-y-6" role="status" aria-live="polite">
      <span className="sr-only">Loading documents…</span>
      <Skeleton className="h-9 w-48" />
      <Skeleton className="h-12 w-full max-w-2xl" />
      <Skeleton className="h-11 w-full max-w-md" />
      <div className="hidden space-y-2 md:block">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
      <div className="space-y-3 md:hidden">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    </div>
  );
}
