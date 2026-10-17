import "server-only";

import type { ReactNode } from "react";
import { duplicateEmailBuilderState, filledBuilderState } from "@/modules/sign/ui/fixtures/builder";
import {
  BILLING_STATES,
  BUILDER_STATES,
  DASHBOARD_STATES,
  DOCUMENTS_LIST_STATES,
  DOCUMENT_DETAIL_STATES,
  SETTINGS_STATES,
  TEMPLATE_PICKER_STATES,
  UPLOAD_STATES,
} from "@/modules/sign/ui/fixtures/screens";
import { BillingScreen } from "@/modules/sign/ui/screens/billing-screen";
import { BuilderScreen } from "@/modules/sign/ui/screens/builder/builder-screen";
import { DashboardScreen } from "@/modules/sign/ui/screens/dashboard-screen";
import { DocumentDetailScreen } from "@/modules/sign/ui/screens/document-detail-screen";
import { DocumentsListScreen, DocumentsListSkeleton } from "@/modules/sign/ui/screens/documents-list-screen";
import { SettingsScreen } from "@/modules/sign/ui/screens/settings-screen";
import { TemplatePickerScreen } from "@/modules/sign/ui/screens/template-picker-screen";
import { UploadScreen } from "@/modules/sign/ui/screens/upload/upload-screen";
import type { PlacedField } from "@/modules/sign/ui/screens/upload/upload-state";
import {
  REVIEW_ALL_FILLED,
  REVIEW_STATES,
  REVIEW_VM,
  REVIEW_VM_SHORT,
  SIGNER_CONTEXT,
  SIGNER_STATE_KINDS,
  VERIFY_STATES,
} from "@/modules/sign/ui/fixtures/signer";
import { PreviewFlow, PreviewState, PreviewVerify } from "./signer-previews";

/** Every sender and signer screen in every fixture state, for /tools/sign/dev/screens (development only). */

export type PreviewState = { id: string; label: string; render: () => ReactNode };
export type PreviewScreen = {
  id: string;
  title: string;
  route: string;
  /** Signer screens render their own SignerShell at full width. */
  group: "sender" | "signer";
  states: PreviewState[];
};

/** Preview only: the settings screen needs a Server Action; this one does nothing. */
async function previewLogoutAll(): Promise<void> {
  "use server";
}

const SAMPLE_FIELDS: PlacedField[] = [
  { id: "field-1", type: "signature", signerId: "s1", page: 1, x: 8, y: 72 },
  { id: "field-2", type: "date", signerId: "s1", page: 1, x: 46, y: 73 },
  { id: "field-3", type: "initials", signerId: "s2", page: 2, x: 80, y: 88 },
  { id: "field-4", type: "checkbox", signerId: "s2", page: 2, x: 8, y: 40 },
];

const builderBase = BUILDER_STATES[0].vm;

export const PREVIEW_SCREENS: PreviewScreen[] = [
  {
    id: "dashboard",
    title: "Dashboard",
    route: "/tools/sign/dashboard",
    group: "sender",
    states: DASHBOARD_STATES.map((s) => ({ id: s.id, label: s.label, render: () => <DashboardScreen vm={s.vm} /> })),
  },
  {
    id: "documents",
    title: "Documents list",
    route: "/tools/sign/documents",
    group: "sender",
    states: [
      ...DOCUMENTS_LIST_STATES.map((s) => ({ id: s.id, label: s.label, render: () => <DocumentsListScreen vm={s.vm} /> })),
      { id: "loading", label: "Loading", render: () => <DocumentsListSkeleton /> },
    ],
  },
  {
    id: "document",
    title: "Document detail",
    route: "/tools/sign/documents/[id]",
    group: "sender",
    states: DOCUMENT_DETAIL_STATES.map((s) => ({ id: s.id, label: s.label, render: () => <DocumentDetailScreen vm={s.vm} /> })),
  },
  {
    id: "templates",
    title: "Template picker",
    route: "/tools/sign/new",
    group: "sender",
    states: TEMPLATE_PICKER_STATES.map((s) => ({ id: s.id, label: s.label, render: () => <TemplatePickerScreen vm={s.vm} /> })),
  },
  {
    id: "builder",
    title: "Builder",
    route: "/tools/sign/new/[template]",
    group: "sender",
    states: [
      { id: "details-empty", label: "Details, empty", render: () => <BuilderScreen vm={builderBase} /> },
      { id: "details-errors", label: "Details, required fields missing", render: () => <BuilderScreen vm={builderBase} initialShowErrors /> },
      {
        id: "details-saved",
        label: "Details, filled and saved",
        render: () => <BuilderScreen vm={builderBase} initialState={filledBuilderState(builderBase.template, 2, 0)} initialSaveState="saved" />,
      },
      {
        id: "signers",
        label: "Signers, free plan at its 2-signer limit",
        render: () => <BuilderScreen vm={builderBase} initialState={filledBuilderState(builderBase.template, 2, 1)} />,
      },
      {
        id: "signers-duplicate",
        label: "Signers, duplicate email",
        render: () => <BuilderScreen vm={builderBase} initialState={duplicateEmailBuilderState(builderBase.template)} initialShowErrors />,
      },
      {
        id: "signers-pro-ten",
        label: "Signers, Sign Pro with 10 signers",
        render: () => {
          const vm = BUILDER_STATES.find((s) => s.id === "pro")!.vm;
          return <BuilderScreen vm={vm} initialState={filledBuilderState(vm.template, 10, 1)} />;
        },
      },
      ...BUILDER_STATES.map((s) => ({
        id: `review-${s.id}`,
        label: `Review & send, ${s.label}`,
        render: () => <BuilderScreen vm={s.vm} initialState={filledBuilderState(s.vm.template, 2, 2)} />,
      })),
      {
        id: "review-free-three-signers",
        label: "Review & send, free plan with 3 signers",
        render: () => {
          const vm = { ...builderBase, plan: { ...builderBase.plan, maxSigners: 10 } };
          return <BuilderScreen vm={vm} initialState={filledBuilderState(vm.template, 3, 2)} />;
        },
      },
    ],
  },
  {
    id: "upload",
    title: "Upload your own PDF",
    route: "/tools/sign/new/upload",
    group: "sender",
    states: [
      { id: "drop-zone", label: "Drop zone", render: () => <UploadScreen vm={UPLOAD_STATES[0].vm} /> },
      ...UPLOAD_STATES.map((s) => ({
        id: `place-${s.id}`,
        label: `Placing fields, ${s.label}`,
        render: () => (
          <UploadScreen
            vm={s.vm}
            initialFile={{ name: "Services agreement - signed draft v3.pdf", size: 2_457_600, pages: 3 }}
            initialFields={SAMPLE_FIELDS.filter((f) => s.vm.signers.some((signer) => signer.id === f.signerId))}
          />
        ),
      })),
    ],
  },
  {
    id: "billing",
    title: "Billing",
    route: "/tools/sign/billing",
    group: "sender",
    states: BILLING_STATES.map((s) => ({ id: s.id, label: s.label, render: () => <BillingScreen vm={s.vm} /> })),
  },
  {
    id: "settings",
    title: "Settings",
    route: "/tools/sign/settings",
    group: "sender",
    states: SETTINGS_STATES.map((s) => ({
      id: s.id,
      label: s.label,
      render: () => <SettingsScreen vm={s.vm} logoutAllAction={previewLogoutAll} />,
    })),
  },

  {
    id: "signer-verify",
    title: "Signer: verify email",
    route: "/tools/sign/sign",
    group: "signer",
    states: VERIFY_STATES.map((s) => ({ id: s.id, label: s.label, render: () => <PreviewVerify {...s.vm} /> })),
  },
  {
    id: "signer-consent",
    title: "Signer: e-sign consent",
    route: "/tools/sign/sign",
    group: "signer",
    states: [
      { id: "default", label: "Consent", render: () => <PreviewFlow vm={REVIEW_VM} /> },
      { id: "not-ticked", label: "Continue without ticking the box", render: () => <PreviewFlow vm={REVIEW_VM} preview={{ consentShowError: true }} /> },
      { id: "no-sender", label: "No sender name", render: () => <PreviewFlow vm={REVIEW_VM_SHORT} /> },
    ],
  },
  {
    id: "signer-review",
    title: "Signer: review the document",
    route: "/tools/sign/sign",
    group: "signer",
    states: REVIEW_STATES.map((s) => ({
      id: s.id,
      label: s.label,
      render: () => <PreviewFlow vm={s.vm.vm} preview={{ step: "review", reviewValues: s.vm.values }} />,
    })),
  },
  {
    id: "signer-sign",
    title: "Signer: add a signature",
    route: "/tools/sign/sign",
    group: "signer",
    states: [
      { id: "draw", label: "Draw", render: () => <PreviewFlow vm={REVIEW_VM} preview={{ step: "review", reviewDialog: { kind: "signature", tab: "draw" } }} /> },
      { id: "type", label: "Type (keyboard), with preview", render: () => <PreviewFlow vm={REVIEW_VM} preview={{ step: "review", reviewDialog: { kind: "signature", tab: "type" } }} /> },
      { id: "upload", label: "Upload", render: () => <PreviewFlow vm={REVIEW_VM} preview={{ step: "review", reviewDialog: { kind: "signature", tab: "upload" } }} /> },
      {
        id: "upload-too-large",
        label: "Upload, image too large",
        render: () => (
          <PreviewFlow
            vm={REVIEW_VM}
            preview={{ step: "review", reviewDialog: { kind: "signature", tab: "upload", uploadError: "This image is 2.4 MB. The limit is 1 MB." } }}
          />
        ),
      },
      { id: "initials", label: "Initials, typed", render: () => <PreviewFlow vm={REVIEW_VM} preview={{ step: "review", reviewDialog: { kind: "initials", tab: "type" } }} /> },
    ],
  },
  {
    id: "signer-done",
    title: "Signer: signed",
    route: "/tools/sign/sign",
    group: "signer",
    states: [
      { id: "done", label: "Signed", render: () => <PreviewFlow vm={REVIEW_VM} preview={{ step: "done", reviewValues: REVIEW_ALL_FILLED }} /> },
    ],
  },
  {
    id: "signer-decline",
    title: "Signer: decline",
    route: "/tools/sign/sign",
    group: "signer",
    states: [
      { id: "reason", label: "Reason", render: () => <PreviewFlow vm={REVIEW_VM} preview={{ step: "decline" }} /> },
      { id: "reason-missing", label: "Reason missing", render: () => <PreviewFlow vm={REVIEW_VM} preview={{ step: "decline", declineShowError: true }} /> },
      {
        id: "confirm",
        label: "Confirm",
        render: () => (
          <PreviewFlow vm={REVIEW_VM} preview={{ step: "decline", declineReason: "The start date should be 1 March, not 1 February.", declineConfirmOpen: true }} />
        ),
      },
      { id: "declined", label: "Declined", render: () => <PreviewFlow vm={REVIEW_VM} preview={{ step: "declined" }} /> },
    ],
  },
  {
    id: "signer-states",
    title: "Signer: link and session states",
    route: "/tools/sign/s/invalid, /tools/sign/s/not-yet, /tools/sign/sign",
    group: "signer",
    states: SIGNER_STATE_KINDS.map((k) => ({
      id: k.id,
      label: k.label,
      // Invalid and not-yet pages have no signer session, so no branding.
      render: () => <PreviewState kind={k.id} context={k.id === "invalid" || k.id === "not-yet" ? null : SIGNER_CONTEXT} />,
    })),
  },
];

/** Link to one screen (and optionally one state) in the preview. */
export function previewHref(screenId: string, stateId?: string): string {
  const base = "/tools/sign/dev/screens/" + encodeURIComponent(screenId);
  return stateId ? base + "?state=" + encodeURIComponent(stateId) : base;
}

export function findPreviewScreen(id: string): PreviewScreen | undefined {
  return PREVIEW_SCREENS.find((s) => s.id === id);
}
