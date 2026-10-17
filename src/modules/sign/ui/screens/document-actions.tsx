"use client";

import * as React from "react";
import { Ban, BellRing, Copy, Download, FileCheck2 } from "lucide-react";
import { Button } from "../button";
import { ConfirmDialog } from "../dialog";
import type { SignDocumentStatusName } from "@/platform/db/sign-status";
import { VOID_CONSEQUENCES, documentActions } from "./document-policy";
import { comingSoon } from "./placeholder-actions";

/** Action bar on the document page. Buttons are placeholders until Step 9 wires the APIs. */
export function DocumentActionBar({ status }: { status: SignDocumentStatusName }) {
  const actions = documentActions(status);
  const [voidOpen, setVoidOpen] = React.useState(false);
  return (
    <div className="flex flex-wrap gap-3">
      {actions.canDownload ? (
        <>
          <Button icon={<Download />} onClick={() => comingSoon("Downloading the signed PDF")}>
            Download signed PDF
          </Button>
          <Button variant="secondary" icon={<FileCheck2 />} onClick={() => comingSoon("Downloading the audit certificate")}>
            Download audit certificate
          </Button>
        </>
      ) : null}
      {actions.canRemind ? (
        <Button variant="secondary" icon={<BellRing />} onClick={() => comingSoon("Sending reminders")}>
          Remind all
        </Button>
      ) : null}
      <Button variant="secondary" icon={<Copy />} onClick={() => comingSoon("Duplicating documents")}>
        Duplicate
      </Button>
      {actions.canVoid ? (
        <ConfirmDialog
          open={voidOpen}
          onOpenChange={setVoidOpen}
          trigger={
            <Button variant="danger" icon={<Ban />}>
              Void document
            </Button>
          }
          title="Void this document?"
          consequences={VOID_CONSEQUENCES}
          confirmLabel="Void document"
          onConfirm={() => {
            setVoidOpen(false);
            comingSoon("Voiding documents");
          }}
        />
      ) : null}
    </div>
  );
}

/** Per-signer reminder button. */
export function RemindSignerButton({ name }: { name: string }) {
  return (
    <Button size="sm" variant="secondary" icon={<BellRing />} aria-label={`Remind ${name}`} onClick={() => comingSoon("Sending reminders")}>
      Remind
    </Button>
  );
}
