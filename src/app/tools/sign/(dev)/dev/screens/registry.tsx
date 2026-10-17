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

/** Every sender screen in every fixture state, for /tools/sign/dev/screens (development only). */

export type PreviewState = { id: string; label: string; render: () => ReactNode };
export type PreviewScreen = { id: string; title: string; route: string; states: PreviewState[] };

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
    states: DASHBOARD_STATES.map((s) => ({ id: s.id, label: s.label, render: () => <DashboardScreen vm={s.vm} /> })),
  },
  {
    id: "documents",
    title: "Documents list",
    route: "/tools/sign/documents",
    states: [
      ...DOCUMENTS_LIST_STATES.map((s) => ({ id: s.id, label: s.label, render: () => <DocumentsListScreen vm={s.vm} /> })),
      { id: "loading", label: "Loading", render: () => <DocumentsListSkeleton /> },
    ],
  },
  {
    id: "document",
    title: "Document detail",
    route: "/tools/sign/documents/[id]",
    states: DOCUMENT_DETAIL_STATES.map((s) => ({ id: s.id, label: s.label, render: () => <DocumentDetailScreen vm={s.vm} /> })),
  },
  {
    id: "templates",
    title: "Template picker",
    route: "/tools/sign/new",
    states: TEMPLATE_PICKER_STATES.map((s) => ({ id: s.id, label: s.label, render: () => <TemplatePickerScreen vm={s.vm} /> })),
  },
  {
    id: "builder",
    title: "Builder",
    route: "/tools/sign/new/[template]",
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
    states: BILLING_STATES.map((s) => ({ id: s.id, label: s.label, render: () => <BillingScreen vm={s.vm} /> })),
  },
  {
    id: "settings",
    title: "Settings",
    route: "/tools/sign/settings",
    states: SETTINGS_STATES.map((s) => ({
      id: s.id,
      label: s.label,
      render: () => <SettingsScreen vm={s.vm} logoutAllAction={previewLogoutAll} />,
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
