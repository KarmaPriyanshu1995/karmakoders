import { quickStartCards } from "../screens/template-cards";
import type { DashboardVM, PlanSummaryVM } from "../view-models";
import { DOCUMENT_FIXTURES, FIXTURE_NOW, listDocuments, manyDocuments } from "./documents";

/**
 * Dashboard for a real plan with fixture documents.
 * TODO(Step 7): counts and recent documents from the customer's SignDocument rows.
 */
export function fixtureDashboard(plan: PlanSummaryVM): DashboardVM {
  const all = [...DOCUMENT_FIXTURES, ...manyDocuments(25)];
  const { counts } = listDocuments(all, { filter: "all" });
  const month = FIXTURE_NOW.slice(0, 7);
  const completedThisMonth = all.filter((d) => d.status === "COMPLETED" && d.completedAt?.startsWith(month)).length;
  return {
    plan,
    counts: { waiting: counts.waiting, inProgress: counts.in_progress, completedThisMonth, drafts: counts.draft },
    recent: DOCUMENT_FIXTURES.slice(0, 5),
    quickStart: quickStartCards(),
    isFirstTime: false,
  };
}
