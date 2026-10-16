import type { LucideIcon } from "lucide-react";
import { Ban, Check, CircleCheck, CircleX, Clock, Eye, Hourglass, Mail, PenLine, Pencil } from "lucide-react";
import type { SignDocumentStatusName } from "@/platform/db/sign-status";
import type { Tone } from "./colors";

/**
 * Status vocabulary for Sign (docs/DESIGN.md). Every status has a plain-English label, a site
 * semantic tone and an icon, so status is never shown by colour alone.
 */

export type StatusMeta = { label: string; tone: Tone; icon: LucideIcon };

export const DOCUMENT_STATUS: Record<SignDocumentStatusName, StatusMeta> = {
  DRAFT: { label: "Draft", tone: "neutral", icon: Pencil },
  SENT: { label: "Waiting for signatures", tone: "info", icon: Clock },
  PARTIALLY_SIGNED: { label: "In progress", tone: "warning", icon: PenLine },
  COMPLETED: { label: "Completed", tone: "success", icon: CircleCheck },
  DECLINED: { label: "Declined", tone: "danger", icon: CircleX },
  EXPIRED: { label: "Expired", tone: "neutral", icon: Hourglass },
  VOIDED: { label: "Voided", tone: "neutral", icon: Ban },
};

/** Mirrors the SignSignerStatus enum in prisma/schema.prisma (checked in status.test.ts). */
export const SIGN_SIGNER_STATUSES = ["PENDING", "VIEWED", "SIGNED", "DECLINED"] as const;
export type SignSignerStatusName = (typeof SIGN_SIGNER_STATUSES)[number];

export const SIGNER_STATUS: Record<SignSignerStatusName, StatusMeta> = {
  PENDING: { label: "Not yet opened", tone: "neutral", icon: Mail },
  VIEWED: { label: "Opened", tone: "info", icon: Eye },
  SIGNED: { label: "Signed", tone: "success", icon: Check },
  DECLINED: { label: "Declined", tone: "danger", icon: CircleX },
};

export type SignedCounts = { signed: number; total: number };

/** Label for a document status; PARTIALLY_SIGNED reads "x of y signed" when counts are known. */
export function documentStatusLabel(status: SignDocumentStatusName, counts?: SignedCounts): string {
  if (status === "PARTIALLY_SIGNED" && counts && counts.total > 0) {
    return `${counts.signed} of ${counts.total} signed`;
  }
  return DOCUMENT_STATUS[status].label;
}
