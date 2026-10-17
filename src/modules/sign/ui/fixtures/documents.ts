import { DOCUMENT_FILTERS, type DocumentFilter, type DocumentRowVM, type DocumentsListVM } from "../view-models";
import type { SignDocumentStatusName } from "@/platform/db/sign-status";

/**
 * Document fixtures: every status, long titles/names/emails, 1 and 10 signers, sequential and
 * parallel. Dates are fixed (FIXTURE_NOW) so renders and tests are deterministic.
 * TODO(Step 7): the documents list and dashboard read SignDocument rows instead.
 */

export const FIXTURE_NOW = "2026-10-17T12:00:00.000Z";

const LONG_EMAIL = "alexandra.montgomery-fitzwilliam.procurement@international-holdings-example.co.uk";
const LONG_NAME = "Alexandra Montgomery-Fitzwilliam de la Fontaine";

export const TEN_SIGNER_PEOPLE = [
  { name: "Jordan Lee", email: "jordan@acmestudio.com" },
  { name: "Priya Raman", email: "priya.raman@northwind.io" },
  { name: "Marcus Webb", email: "marcus@webb-legal.co.uk" },
  { name: "Sofia Alvarez", email: "sofia.alvarez@example.es" },
  { name: "Chen Wei", email: "chen.wei@example.com" },
  { name: "Amara Okafor", email: "amara@okafor.ng" },
  { name: "Lukas Becker", email: "lukas.becker@example.de" },
  { name: LONG_NAME, email: LONG_EMAIL },
  { name: "Noah Williams", email: "noah@williams.dev" },
  { name: "Emma Dubois", email: "emma.dubois@example.fr" },
];

function row(input: Partial<DocumentRowVM> & Pick<DocumentRowVM, "id" | "title" | "status">): DocumentRowVM {
  const signers = input.signers ?? TEN_SIGNER_PEOPLE.slice(0, 2);
  return {
    publicId: `KKS-${input.id.toUpperCase().replace(/[^A-Z0-9]/g, "").padEnd(8, "0").slice(0, 8)}`,
    templateName: "Mutual NDA",
    signedCount: 0,
    signerCount: signers.length,
    signers,
    signingOrder: "parallel",
    lastActivity: { label: "Created", at: "2026-10-15T09:30:00.000Z" },
    createdAt: "2026-10-15T09:30:00.000Z",
    expiresAt: "2026-10-29T09:30:00.000Z",
    completedAt: null,
    ...input,
  };
}

export const DOC_DRAFT = row({
  id: "doc_draft",
  title: "Mutual NDA - Acme Studio and Northwind",
  status: "DRAFT",
  expiresAt: null,
  lastActivity: { label: "Edited", at: "2026-10-16T16:10:00.000Z" },
});

export const DOC_SENT = row({
  id: "doc_sent",
  title: "Freelance agreement - Website redesign",
  templateName: "Freelance / Service Agreement",
  status: "SENT",
  signingOrder: "sequential",
  lastActivity: { label: "Sent to Jordan Lee", at: "2026-10-16T10:00:00.000Z" },
});

export const DOC_PARTIAL = row({
  id: "doc_partial",
  title: "Offer letter - Senior Product Designer",
  templateName: "Offer Letter",
  status: "PARTIALLY_SIGNED",
  signedCount: 1,
  lastActivity: { label: "Signed by Jordan Lee", at: "2026-10-16T14:20:00.000Z" },
});

export const DOC_COMPLETED = row({
  id: "doc_completed",
  title: "One-way NDA - Investor preview",
  templateName: "One-way NDA",
  status: "COMPLETED",
  signedCount: 2,
  completedAt: "2026-10-12T11:45:00.000Z",
  lastActivity: { label: "Completed", at: "2026-10-12T11:45:00.000Z" },
});

export const DOC_DECLINED = row({
  id: "doc_declined",
  title: "Independent contractor agreement - Q4 data migration",
  templateName: "Independent Contractor Agreement",
  status: "DECLINED",
  signingOrder: "sequential",
  lastActivity: { label: "Declined by Priya Raman", at: "2026-10-11T08:05:00.000Z" },
});

export const DOC_EXPIRED = row({
  id: "doc_expired",
  title: "Consent and release form - Product photo shoot",
  templateName: "Consent / Release Form",
  status: "EXPIRED",
  expiresAt: "2026-10-01T09:00:00.000Z",
  createdAt: "2026-09-17T09:00:00.000Z",
  lastActivity: { label: "Expired", at: "2026-10-01T09:00:00.000Z" },
});

export const DOC_VOIDED = row({
  id: "doc_voided",
  title: "No objection certificate - Travel",
  templateName: "No Objection Certificate (NOC)",
  status: "VOIDED",
  signers: [TEN_SIGNER_PEOPLE[2]],
  lastActivity: { label: "Voided by you", at: "2026-10-09T13:00:00.000Z" },
});

export const DOC_ONE_SIGNER = row({
  id: "doc_one_signer",
  title: "Acknowledgment of equipment receipt",
  templateName: "Acknowledgment / Receipt",
  status: "SENT",
  signers: [TEN_SIGNER_PEOPLE[4]],
  lastActivity: { label: "Opened by Chen Wei", at: "2026-10-17T08:40:00.000Z" },
});

export const DOC_TEN_SIGNERS = row({
  id: "doc_ten_signers",
  title: "Mutual NDA - Partner programme (10 parties)",
  status: "PARTIALLY_SIGNED",
  signers: TEN_SIGNER_PEOPLE,
  signedCount: 4,
  signingOrder: "sequential",
  lastActivity: { label: "Signed by Chen Wei", at: "2026-10-17T09:15:00.000Z" },
});

export const DOC_LONG = row({
  id: "doc_long",
  title:
    "Mutual non-disclosure agreement between International Holdings Example Limited and Acme Studio LLC regarding the proposed joint venture",
  status: "SENT",
  signers: [{ name: LONG_NAME, email: LONG_EMAIL }, TEN_SIGNER_PEOPLE[0]],
  lastActivity: { label: `Opened by ${LONG_NAME}`, at: "2026-10-17T07:00:00.000Z" },
});

/** One of each status plus the edge cases, newest activity first. */
export const DOCUMENT_FIXTURES: DocumentRowVM[] = [
  DOC_TEN_SIGNERS,
  DOC_ONE_SIGNER,
  DOC_LONG,
  DOC_DRAFT,
  DOC_PARTIAL,
  DOC_SENT,
  DOC_COMPLETED,
  DOC_DECLINED,
  DOC_VOIDED,
  DOC_EXPIRED,
];

const STATUS_CYCLE: SignDocumentStatusName[] = ["SENT", "PARTIALLY_SIGNED", "COMPLETED", "DRAFT", "DECLINED", "EXPIRED", "VOIDED"];

/** `count` generated documents for pagination ("many items"). Deterministic. */
export function manyDocuments(count: number): DocumentRowVM[] {
  return Array.from({ length: count }, (_, index) => {
    const status = STATUS_CYCLE[index % STATUS_CYCLE.length];
    const day = String(28 - (index % 27)).padStart(2, "0");
    const at = `2026-09-${day}T10:00:00.000Z`;
    return row({
      id: `doc_bulk_${String(index + 1).padStart(3, "0")}`,
      title: `Contractor agreement #${index + 1}`,
      templateName: "Independent Contractor Agreement",
      status,
      signedCount: status === "COMPLETED" ? 2 : status === "PARTIALLY_SIGNED" ? 1 : 0,
      completedAt: status === "COMPLETED" ? at : null,
      lastActivity: { label: "Updated", at },
      createdAt: at,
    });
  });
}

const FILTER_STATUSES: Record<Exclude<DocumentFilter, "all">, SignDocumentStatusName[]> = {
  waiting: ["SENT"],
  in_progress: ["PARTIALLY_SIGNED"],
  completed: ["COMPLETED"],
  draft: ["DRAFT"],
  closed: ["DECLINED", "EXPIRED", "VOIDED"],
};

export function parseDocumentFilter(value: string | undefined): DocumentFilter {
  return (DOCUMENT_FILTERS as readonly string[]).includes(value ?? "") ? (value as DocumentFilter) : "all";
}

function matchesFilter(doc: DocumentRowVM, filter: DocumentFilter, period: "month" | null, now: string): boolean {
  if (filter !== "all" && !FILTER_STATUSES[filter].includes(doc.status)) return false;
  if (period === "month" && filter === "completed") return doc.completedAt?.slice(0, 7) === now.slice(0, 7);
  return true;
}

function matchesQuery(doc: DocumentRowVM, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return doc.title.toLowerCase().includes(q) || doc.signers.some((s) => s.email.toLowerCase().includes(q));
}

export const DOCUMENTS_PAGE_SIZE = 10;

/**
 * Filters, searches and paginates fixture rows like the future DB query will (cursor = the id of
 * the first row on the page). TODO(Step 7): replace with a Prisma query scoped to the owner.
 */
export function listDocuments(
  all: DocumentRowVM[],
  params: { filter: DocumentFilter; period?: "month" | null; query?: string; cursor?: string | null; now?: string }
): DocumentsListVM {
  const period = params.period ?? null;
  const query = params.query ?? "";
  const now = params.now ?? FIXTURE_NOW;
  const searched = all.filter((doc) => matchesQuery(doc, query));
  const counts = Object.fromEntries(
    DOCUMENT_FILTERS.map((f) => [f, searched.filter((doc) => matchesFilter(doc, f, null, now)).length])
  ) as Record<DocumentFilter, number>;
  const matching = searched.filter((doc) => matchesFilter(doc, params.filter, period, now));

  const startIndex = Math.max(params.cursor ? matching.findIndex((doc) => doc.id === params.cursor) : 0, 0);
  const rows = matching.slice(startIndex, startIndex + DOCUMENTS_PAGE_SIZE);
  const next = matching[startIndex + DOCUMENTS_PAGE_SIZE];
  const prev = startIndex > 0 ? matching[Math.max(startIndex - DOCUMENTS_PAGE_SIZE, 0)] : undefined;

  return {
    rows,
    filter: params.filter,
    period,
    query,
    counts,
    page: { nextCursor: next?.id ?? null, prevCursor: prev?.id ?? null },
    hasAnyDocuments: all.length > 0,
  };
}
