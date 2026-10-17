import type { SignDocumentStatusName } from "@/platform/db/sign-status";
import type { SignerVM } from "../view-models";

/**
 * Which actions a sender sees for a document (PRD S5, S6). UI only: every action is re-checked
 * on the server when it is wired (Step 9).
 */
export type DocumentActions = {
  canRemind: boolean;
  canVoid: boolean;
  canDownload: boolean;
  canVerify: boolean;
};

const ACTIVE: SignDocumentStatusName[] = ["SENT", "PARTIALLY_SIGNED"];

export function documentActions(status: SignDocumentStatusName): DocumentActions {
  return {
    canRemind: ACTIVE.includes(status),
    // Completed documents can't be voided (S6); declined, expired and voided are already closed.
    canVoid: status === "DRAFT" || ACTIVE.includes(status),
    canDownload: status === "COMPLETED",
    canVerify: status === "COMPLETED",
  };
}

/** A reminder makes sense for a signer who has the link (sent) and hasn't signed or declined. */
export function canRemindSigner(status: SignDocumentStatusName, signer: Pick<SignerVM, "status" | "sentAt">): boolean {
  return ACTIVE.includes(status) && signer.sentAt !== null && (signer.status === "PENDING" || signer.status === "VIEWED");
}

export const VOID_CONSEQUENCES =
  "Signers can no longer open or sign this document. Everyone who already received it gets an email saying it was voided. This can't be undone.";
