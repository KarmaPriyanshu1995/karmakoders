import "server-only";

import type { FieldValue, ReviewVM, SignerContextVM, SignerFieldVM, SignerPageVM, SignerStateKind } from "../signer-view-models";
import type { FixtureState } from "./screens";

/**
 * Signer screens in every state, for the dev preview (/tools/sign/dev/screens) and the screen
 * tests only. Real signer routes never import this file (signer-routes.test.ts).
 */

export const SIGNER_CONTEXT: SignerContextVM = {
  documentTitle: "Mutual NDA – Northwind Studio and Acme Robotics",
  senderName: "Northwind Studio",
  brand: { companyName: "Northwind Studio", logoUrl: null },
  signerName: "Jordan Avery Lee",
  maskedEmail: "j***@example.com",
  message: "Hi Jordan, here's the NDA we discussed on Tuesday. Please sign by Friday so we can share the design files.",
};

export const SIGNER_CONTEXT_PLAIN: SignerContextVM = {
  ...SIGNER_CONTEXT,
  documentTitle: "Offer letter",
  senderName: null,
  brand: { companyName: null, logoUrl: null },
  message: null,
};

const PAGES: SignerPageVM[] = [
  {
    number: 1,
    blocks: [
      { kind: "heading", text: "Mutual Non-Disclosure Agreement" },
      {
        kind: "paragraph",
        text: "This agreement is made between Northwind Studio (\"Party A\") and Acme Robotics (\"Party B\"), together \"the Parties\", effective on the date of the last signature below.",
      },
      { kind: "heading", text: "1. Confidential information" },
      {
        kind: "paragraph",
        text: "Confidential information means any non-public business, technical or financial information that one Party shares with the other, in any form, and that is marked confidential or would reasonably be understood to be confidential.",
      },
      { kind: "heading", text: "2. Obligations" },
      {
        kind: "paragraph",
        text: "Each Party will use the other's confidential information only to evaluate a possible business relationship, will protect it with reasonable care, and will not share it with anyone except employees and advisers who need to know it.",
      },
    ],
  },
  {
    number: 2,
    blocks: [
      { kind: "heading", text: "3. Term" },
      {
        kind: "paragraph",
        text: "This agreement lasts two years from the effective date. The obligations in section 2 continue for three years after it ends.",
      },
      { kind: "heading", text: "4. Signatures" },
      { kind: "paragraph", text: "Each Party signs below to show that it agrees to this agreement." },
    ],
  },
  {
    number: 3,
    blocks: [
      { kind: "heading", text: "Schedule A – Contacts" },
      { kind: "paragraph", text: "Each Party names one person to receive notices under this agreement." },
    ],
  },
];

const FIELDS: SignerFieldVM[] = [
  { id: "f-initials-1", type: "initials", page: 1, x: 82, y: 88, w: 12, h: 6, mine: true, required: true, label: "Initials, page 1" },
  { id: "f-a-sign", type: "signature", page: 2, x: 8, y: 52, w: 38, h: 9, mine: false, required: true, label: "Party A signature" },
  { id: "f-a-date", type: "date", page: 2, x: 8, y: 63, w: 26, h: 5, mine: false, required: true, label: "Date" },
  { id: "f-b-sign", type: "signature", page: 2, x: 54, y: 52, w: 38, h: 9, mine: true, required: true, label: "Your signature" },
  { id: "f-b-date", type: "date", page: 2, x: 54, y: 63, w: 26, h: 5, mine: true, required: true, label: "Date signed" },
  { id: "f-b-title", type: "text", page: 2, x: 54, y: 71, w: 38, h: 5, mine: true, required: true, label: "Job title" },
  { id: "f-b-ack", type: "checkbox", page: 3, x: 8, y: 30, w: 60, h: 5, mine: true, required: true, label: "I am authorised to sign for Acme Robotics" },
];

export const REVIEW_VM: ReviewVM = { context: SIGNER_CONTEXT, pages: PAGES, fields: FIELDS };

/** Two pages, two fields: signature and job title. */
export const REVIEW_VM_SHORT: ReviewVM = {
  context: SIGNER_CONTEXT_PLAIN,
  pages: PAGES.slice(0, 2),
  fields: FIELDS.filter((f) => f.page === 2),
};

/** What a real route shows before document content is wired: a safe empty state. */
export const REVIEW_VM_NO_CONTENT: ReviewVM = { context: SIGNER_CONTEXT, pages: [], fields: [] };

const TYPED: FieldValue = { kind: "signature", signature: { method: "type", name: "Jordan Avery Lee", font: "great-vibes" } };
const TYPED_INITIALS: FieldValue = { kind: "signature", signature: { method: "type", name: "JAL", font: "great-vibes" } };

export const REVIEW_ALL_FILLED: Record<string, FieldValue> = {
  "f-initials-1": TYPED_INITIALS,
  "f-b-sign": TYPED,
  "f-b-title": { kind: "text", text: "Head of Partnerships" },
  "f-b-ack": { kind: "checkbox", checked: true },
};

export const REVIEW_TWO_LEFT: Record<string, FieldValue> = {
  "f-initials-1": TYPED_INITIALS,
  "f-b-sign": TYPED,
};

export type ReviewFixture = { vm: ReviewVM; values?: Record<string, FieldValue> };

export const REVIEW_STATES: FixtureState<ReviewFixture>[] = [
  { id: "start", label: "Start: message from the sender, 4 fields to complete", vm: { vm: REVIEW_VM } },
  { id: "two-left", label: "2 fields left", vm: { vm: REVIEW_VM, values: REVIEW_TWO_LEFT } },
  { id: "all-filled", label: "All fields complete (Finish)", vm: { vm: REVIEW_VM, values: REVIEW_ALL_FILLED } },
  { id: "no-message", label: "No message, no branding, 2 pages", vm: { vm: REVIEW_VM_SHORT } },
  { id: "no-content", label: "Document content not available (real-route safe state)", vm: { vm: REVIEW_VM_NO_CONTENT } },
];

export type VerifyFixture = {
  context: SignerContextVM;
  step: "send" | "code";
  code?: string;
  error?: string;
  cooldown?: number;
};

export const VERIFY_STATES: FixtureState<VerifyFixture>[] = [
  { id: "send", label: "Send a code", vm: { context: SIGNER_CONTEXT, step: "send" } },
  { id: "code", label: "Enter the code (resend countdown)", vm: { context: SIGNER_CONTEXT, step: "code", code: "4821", cooldown: 42 } },
  {
    id: "wrong-code",
    label: "Wrong or expired code",
    vm: { context: SIGNER_CONTEXT, step: "code", code: "482193", error: "That code is incorrect or has expired. Check the email or request a new code." },
  },
  { id: "resend", label: "Resend available", vm: { context: SIGNER_CONTEXT_PLAIN, step: "code" } },
  {
    id: "network",
    label: "Network error",
    vm: { context: SIGNER_CONTEXT, step: "send", error: "We couldn't reach KarmaKoders Sign. Check your connection and try again." },
  },
];

export const SIGNER_STATE_KINDS: { id: SignerStateKind; label: string }[] = [
  { id: "invalid", label: "Link invalid" },
  { id: "not-yet", label: "Not your turn yet" },
  { id: "expired", label: "Session expired" },
  { id: "voided", label: "Document voided while signing" },
  { id: "already-signed", label: "Already signed" },
  { id: "network", label: "Network error with retry" },
];
