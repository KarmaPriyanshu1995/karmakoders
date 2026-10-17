import type { SignDocumentStatusName } from "@/platform/db/sign-status";
import type { TemplateCategory, TemplateField, TemplateSignerRole } from "@/modules/sign/templates/catalog";
import type { SignSignerStatusName } from "./status";

/**
 * View models for the sender screens (src/modules/sign/ui/screens). Screens are presentational:
 * they take one of these, never call the database or an API. Types only, so client-safe.
 * Dates are ISO 8601 strings (serialisable from Server to Client Components). Money is integer
 * cents, credits are integers.
 */

export type IsoDate = string;

/** What the customer's sends are paid with. "pro" covers Sign Pro and All Access. */
export type PlanKind = "free" | "credits" | "pro";

export type PlanSummaryVM = {
  kind: PlanKind;
  /** "Free", "Sign Pro", "All Access (Yearly)", … from plans.ts. */
  planName: string;
  /** Active subscription product, "Sign Pro" or "All Access" (no interval); null without one. */
  subscriptionName: string | null;
  creditsBalance: number;
  /** Max signers per document for the customer's best entitlement (plans.ts). */
  maxSigners: number;
  /** Max signers on a free document (plans.ts free.maxSigners). */
  freeMaxSigners: number;
  /** Free documents sent this calendar month (UTC). */
  freeUsed: number;
  freeLimit: number;
  /** Subscription renewal date; null without a subscription. */
  renewsAt: IsoDate | null;
};

export type SigningOrder = "sequential" | "parallel";

export type DocumentRowVM = {
  id: string;
  publicId: string;
  title: string;
  templateName: string;
  status: SignDocumentStatusName;
  signedCount: number;
  signerCount: number;
  /** Used for display and search by signer email. */
  signers: { name: string; email: string }[];
  signingOrder: SigningOrder;
  lastActivity: { label: string; at: IsoDate };
  createdAt: IsoDate;
  expiresAt: IsoDate | null;
  completedAt: IsoDate | null;
};

export type SignerVM = {
  id: string;
  name: string;
  email: string;
  /** Template role label, e.g. "Party A". */
  role: string;
  /** 1-based signing order. */
  order: number;
  status: SignSignerStatusName;
  /** null while a sequential signer is still waiting for their turn (or the document is a draft). */
  sentAt: IsoDate | null;
  viewedAt: IsoDate | null;
  signedAt: IsoDate | null;
  declinedAt: IsoDate | null;
  declineReason: string | null;
};

export type ActivityKind =
  | "created"
  | "sent"
  | "viewed"
  | "signed"
  | "declined"
  | "reminded"
  | "voided"
  | "expired"
  | "completed";

export type ActivityEventVM = {
  id: string;
  kind: ActivityKind;
  /** Who did it: a signer name, "You" for the sender, or "KarmaKoders Sign" for the system. */
  actor: string;
  at: IsoDate;
  /** Extra plain-English detail, e.g. a decline reason. */
  detail?: string;
};

export type TemplateCardVM = {
  slug: string;
  name: string;
  shortDescription: string;
  category: TemplateCategory;
  categoryLabel: string;
};

export type DashboardCountsVM = {
  waiting: number;
  inProgress: number;
  completedThisMonth: number;
  drafts: number;
};

export type DashboardVM = {
  plan: PlanSummaryVM;
  counts: DashboardCountsVM;
  /** Up to five most recent documents. */
  recent: DocumentRowVM[];
  quickStart: TemplateCardVM[];
  /** No documents at all yet: show the first-document guide. */
  isFirstTime: boolean;
};

/** Status filter tabs on the documents list (URL ?status=). */
export const DOCUMENT_FILTERS = ["all", "waiting", "in_progress", "completed", "draft", "closed"] as const;
export type DocumentFilter = (typeof DOCUMENT_FILTERS)[number];

export type DocumentsListVM = {
  rows: DocumentRowVM[];
  filter: DocumentFilter;
  /** "month" narrows Completed to this calendar month (dashboard link). */
  period: "month" | null;
  query: string;
  counts: Record<DocumentFilter, number>;
  page: { nextCursor: string | null; prevCursor: string | null };
  /** True when the customer has no documents at all (as opposed to no matches). */
  hasAnyDocuments: boolean;
};

export type DocumentPreviewVM = {
  fields: { label: string; value: string }[];
};

export type DocumentDetailVM = {
  document: DocumentRowVM & { message: string | null; remindersEnabled: boolean };
  signers: SignerVM[];
  activity: ActivityEventVM[];
  preview: DocumentPreviewVM;
};

export type TemplatePickerVM = {
  templates: TemplateCardVM[];
  categories: { id: TemplateCategory; label: string }[];
};

export type BuilderTemplateVM = {
  slug: string;
  name: string;
  fields: TemplateField[];
  signerRoles: TemplateSignerRole[];
};

export type BuilderVM = {
  template: BuilderTemplateVM;
  plan: PlanSummaryVM;
  defaultExpiryDays: number;
};

export type UploadSignerVM = { id: string; name: string; email: string };

export type UploadVM = {
  maxBytes: number;
  signers: UploadSignerVM[];
};

export type PriceVM = { id: string; name: string; description: string; price: string; features: string[] };

export type CreditPackVM = PriceVM & { credits: number };

export type SubscriptionPairVM = {
  product: string;
  name: string;
  description: string;
  features: string[];
  monthly: { id: string; price: string };
  yearly: { id: string; price: string; savingsMonths: number };
  current: boolean;
};

export type PurchaseVM = {
  id: string;
  description: string;
  amount: string;
  at: IsoDate;
  status: "paid" | "refunded";
};

export type BillingVM = {
  plan: PlanSummaryVM;
  creditPacks: CreditPackVM[];
  subscriptions: SubscriptionPairVM[];
  purchases: PurchaseVM[];
};

export type SessionVM = {
  id: string;
  /** "Chrome on Windows", "Safari on iPhone", "Unknown device". */
  device: string;
  lastActiveAt: IsoDate;
  current: boolean;
};

export type SettingsVM = {
  profile: { name: string | null; email: string };
  plan: PlanSummaryVM;
  sessions: SessionVM[];
};
