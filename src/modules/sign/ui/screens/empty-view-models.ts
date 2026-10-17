import { DOCUMENT_FILTERS, type DashboardVM, type DocumentsListVM, type PlanSummaryVM } from "../view-models";
import type { DocumentsSearch } from "./documents-search";
import { quickStartCards } from "./template-cards";

/**
 * View models for real routes whose data isn't wired yet: the screens show their proper empty
 * states. Fixtures (../fixtures) are for the dev preview and tests only, never real routes.
 */

/** TODO(Step 7): counts and recent documents from the customer's SignDocument rows. */
export function emptyDashboard(plan: PlanSummaryVM): DashboardVM {
  return {
    plan,
    counts: { waiting: 0, inProgress: 0, completedThisMonth: 0, drafts: 0 },
    recent: [],
    quickStart: quickStartCards(),
    isFirstTime: true,
  };
}

/** TODO(Step 7): listDocumentsForOwner with the same filter, search and cursor. */
export function emptyDocumentsList(search: DocumentsSearch): DocumentsListVM {
  return {
    rows: [],
    filter: search.status,
    period: search.period,
    query: search.q,
    counts: Object.fromEntries(DOCUMENT_FILTERS.map((f) => [f, 0])) as DocumentsListVM["counts"],
    page: { nextCursor: null, prevCursor: null },
    hasAnyDocuments: false,
  };
}
