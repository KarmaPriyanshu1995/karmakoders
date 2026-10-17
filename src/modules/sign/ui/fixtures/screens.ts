import "server-only";

import { UPLOAD_PDF_MAX_BYTES } from "@/modules/sign/documents/upload-limits";
import { billingOffers } from "../screens/billing-offers";
import { builderTemplateVM, quickStartCards, templatePickerVM } from "../screens/template-cards";
import type {
  BillingVM,
  BuilderVM,
  DashboardVM,
  DocumentDetailVM,
  DocumentsListVM,
  PlanSummaryVM,
  PurchaseVM,
  SessionVM,
  SettingsVM,
  TemplatePickerVM,
  UploadVM,
} from "../view-models";
import { findDocumentDetail } from "./details";
import { DOCUMENT_FIXTURES, DOC_COMPLETED, TEN_SIGNER_PEOPLE, listDocuments, manyDocuments } from "./documents";
import { PLAN_ALL_ACCESS, PLAN_CREDITS, PLAN_FREE_AT_LIMIT, PLAN_FREE_NEW, PLAN_FREE_TWO_USED, PLAN_PRO } from "./plans";

/**
 * Every screen in every state, for the dev preview (/tools/sign/dev/screens) and the screen
 * tests. Server-only because the billing states read prices from plans.ts.
 */

export type FixtureState<VM> = { id: string; label: string; vm: VM };

const UPLOAD_MAX_BYTES = UPLOAD_PDF_MAX_BYTES;

const ALL_DOCS = [...DOCUMENT_FIXTURES, ...manyDocuments(25)];

export const DASHBOARD_STATES: FixtureState<DashboardVM>[] = [
  {
    id: "first-time",
    label: "First time: free plan, no documents",
    vm: {
      plan: PLAN_FREE_NEW,
      counts: { waiting: 0, inProgress: 0, completedThisMonth: 0, drafts: 0 },
      recent: [],
      quickStart: quickStartCards(),
      isFirstTime: true,
    },
  },
  {
    id: "one",
    label: "One document (free, 1 of 3 used)",
    vm: {
      plan: { ...PLAN_FREE_NEW, freeUsed: 1 },
      counts: { waiting: 1, inProgress: 0, completedThisMonth: 0, drafts: 0 },
      recent: [DOCUMENT_FIXTURES[1]],
      quickStart: quickStartCards(),
      isFirstTime: false,
    },
  },
  {
    id: "many-free",
    label: "Many documents, free plan 2 of 3 used",
    vm: {
      plan: PLAN_FREE_TWO_USED,
      counts: { waiting: 3, inProgress: 2, completedThisMonth: 1, drafts: 1 },
      recent: DOCUMENT_FIXTURES.slice(0, 5),
      quickStart: quickStartCards(),
      isFirstTime: false,
    },
  },
  {
    id: "free-at-limit",
    label: "Free plan, out of free documents",
    vm: {
      plan: PLAN_FREE_AT_LIMIT,
      counts: { waiting: 1, inProgress: 1, completedThisMonth: 1, drafts: 0 },
      recent: DOCUMENT_FIXTURES.slice(4, 9),
      quickStart: quickStartCards(),
      isFirstTime: false,
    },
  },
  {
    id: "credits",
    label: "Credits",
    vm: {
      plan: PLAN_CREDITS,
      counts: { waiting: 12, inProgress: 4, completedThisMonth: 9, drafts: 2 },
      recent: DOCUMENT_FIXTURES.slice(0, 5),
      quickStart: quickStartCards(),
      isFirstTime: false,
    },
  },
  {
    id: "pro",
    label: "Sign Pro",
    vm: {
      plan: PLAN_PRO,
      counts: { waiting: 120, inProgress: 48, completedThisMonth: 310, drafts: 7 },
      recent: DOCUMENT_FIXTURES.slice(0, 5),
      quickStart: quickStartCards(),
      isFirstTime: false,
    },
  },
];

export const DOCUMENTS_LIST_STATES: FixtureState<DocumentsListVM>[] = [
  { id: "empty", label: "Empty: no documents yet", vm: listDocuments([], { filter: "all" }) },
  { id: "one", label: "One document", vm: listDocuments([DOC_COMPLETED], { filter: "all" }) },
  { id: "many", label: "Many documents, page 1", vm: listDocuments(ALL_DOCS, { filter: "all" }) },
  {
    id: "page-2",
    label: "Many documents, page 2",
    vm: listDocuments(ALL_DOCS, { filter: "all", cursor: ALL_DOCS[10].id }),
  },
  { id: "in-progress", label: "Filter: in progress", vm: listDocuments(ALL_DOCS, { filter: "in_progress" }) },
  {
    id: "completed-month",
    label: "Filter: completed this month",
    vm: listDocuments(ALL_DOCS, { filter: "completed", period: "month" }),
  },
  { id: "search", label: "Search by signer email", vm: listDocuments(ALL_DOCS, { filter: "all", query: "northwind" }) },
  { id: "no-results", label: "No results", vm: listDocuments(ALL_DOCS, { filter: "all", query: "zzz-no-match" }) },
];

const DETAIL_IDS = [
  ["draft", "Draft", "doc_draft"],
  ["sent-sequential", "Waiting for signatures (sequential)", "doc_sent"],
  ["partial", "In progress, 1 of 2 signed", "doc_partial"],
  ["completed", "Completed", "doc_completed"],
  ["declined", "Declined", "doc_declined"],
  ["expired", "Expired", "doc_expired"],
  ["voided", "Voided, 1 signer", "doc_voided"],
  ["one-signer", "1 signer, opened", "doc_one_signer"],
  ["ten-signers", "10 signers, sequential", "doc_ten_signers"],
  ["long", "Long title, name and email", "doc_long"],
] as const;

export const DOCUMENT_DETAIL_STATES: FixtureState<DocumentDetailVM>[] = DETAIL_IDS.map(([id, label, docId]) => ({
  id,
  label,
  vm: findDocumentDetail(docId)!,
}));

export const TEMPLATE_PICKER_STATES: FixtureState<TemplatePickerVM>[] = [
  { id: "catalog", label: "Catalog", vm: templatePickerVM() },
];

function builder(plan: PlanSummaryVM, slug = "mutual-nda"): BuilderVM {
  return { template: builderTemplateVM(slug)!, plan, defaultExpiryDays: 14 };
}

export const BUILDER_STATES: FixtureState<BuilderVM>[] = [
  { id: "free-new", label: "Free, first free document", vm: builder(PLAN_FREE_NEW) },
  { id: "free-two-used", label: "Free, 2 of 3 used", vm: builder(PLAN_FREE_TWO_USED, "offer-letter") },
  { id: "free-at-limit", label: "Free, out of free documents", vm: builder(PLAN_FREE_AT_LIMIT) },
  { id: "credits", label: "Credits", vm: builder(PLAN_CREDITS, "freelance-service-agreement") },
  { id: "pro", label: "Sign Pro", vm: builder(PLAN_PRO, "no-objection-certificate") },
  { id: "all-access", label: "All Access", vm: builder(PLAN_ALL_ACCESS, "offer-letter") },
];

export const UPLOAD_STATES: FixtureState<UploadVM>[] = [
  { id: "two-signers", label: "2 signers", vm: { maxBytes: UPLOAD_MAX_BYTES, signers: signerList(2) } },
  { id: "one-signer", label: "1 signer", vm: { maxBytes: UPLOAD_MAX_BYTES, signers: signerList(1) } },
  { id: "ten-signers", label: "10 signers", vm: { maxBytes: UPLOAD_MAX_BYTES, signers: signerList(10) } },
];

function signerList(count: number) {
  return TEN_SIGNER_PEOPLE.slice(0, count).map((p, i) => ({ id: `s${i + 1}`, ...p }));
}

export const PURCHASE_FIXTURES: PurchaseVM[] = [
  { id: "p3", description: "Sign Pro (monthly)", amount: "$15", at: "2026-10-17T09:00:00.000Z", status: "paid" },
  { id: "p2", description: "30 Credits", amount: "$25", at: "2026-09-02T15:30:00.000Z", status: "paid" },
  { id: "p1", description: "10 Credits", amount: "$10", at: "2026-08-21T11:10:00.000Z", status: "refunded" },
];

function billing(plan: PlanSummaryVM, purchases: PurchaseVM[]): BillingVM {
  return { plan, ...billingOffers(plan), purchases };
}

export const BILLING_STATES: FixtureState<BillingVM>[] = [
  { id: "free", label: "Free, no purchases", vm: billing(PLAN_FREE_TWO_USED, []) },
  { id: "credits", label: "Credits with purchases", vm: billing(PLAN_CREDITS, PURCHASE_FIXTURES.slice(1)) },
  { id: "pro", label: "Sign Pro", vm: billing(PLAN_PRO, PURCHASE_FIXTURES) },
];

export const SESSION_FIXTURES: SessionVM[] = [
  { id: "sess_1", device: "Chrome on Windows", lastActiveAt: "2026-10-17T11:58:00.000Z", current: true },
  { id: "sess_2", device: "Safari on iPhone", lastActiveAt: "2026-10-16T19:20:00.000Z", current: false },
  { id: "sess_3", device: "Firefox on Linux", lastActiveAt: "2026-10-02T08:00:00.000Z", current: false },
];

export const SETTINGS_STATES: FixtureState<SettingsVM>[] = [
  {
    id: "one-session",
    label: "Free, this device only",
    vm: { profile: { name: null, email: "jordan@acmestudio.com" }, plan: PLAN_FREE_NEW, sessions: SESSION_FIXTURES.slice(0, 1) },
  },
  {
    id: "many-sessions",
    label: "Pro, three devices",
    vm: { profile: { name: "Jordan Lee", email: "jordan@acmestudio.com" }, plan: PLAN_PRO, sessions: SESSION_FIXTURES },
  },
  {
    id: "long-email",
    label: "Long name and email",
    vm: {
      profile: { name: TEN_SIGNER_PEOPLE[7].name, email: TEN_SIGNER_PEOPLE[7].email },
      plan: PLAN_CREDITS,
      sessions: SESSION_FIXTURES.slice(0, 2),
    },
  },
];
