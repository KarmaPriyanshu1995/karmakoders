"use client";

import * as React from "react";
import Link from "next/link";
import { Ban, BellRing, Copy, Download, Eye, MoreHorizontal } from "lucide-react";
import { IconButton } from "../button";
import { ConfirmDialog } from "../dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "../dropdown-menu";
import type { DocumentRowVM } from "../view-models";
import { VOID_CONSEQUENCES, documentActions } from "./document-policy";
import { documentHref } from "./parts";
import { comingSoon } from "./placeholder-actions";

/** Row menu on the documents list: view, remind, duplicate, download (completed), void. */
export function DocumentRowActions({ doc }: { doc: Pick<DocumentRowVM, "id" | "title" | "status"> }) {
  const [voidOpen, setVoidOpen] = React.useState(false);
  const actions = documentActions(doc.status);

  return (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <IconButton aria-label={`Actions for ${doc.title}`}>
            <MoreHorizontal />
          </IconButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem asChild>
            <Link href={documentHref(doc.id)}>
              <Eye aria-hidden />
              View
            </Link>
          </DropdownMenuItem>
          {actions.canRemind ? (
            <DropdownMenuItem onSelect={() => comingSoon("Sending reminders")}>
              <BellRing aria-hidden />
              Remind signers
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuItem onSelect={() => comingSoon("Duplicating documents")}>
            <Copy aria-hidden />
            Duplicate
          </DropdownMenuItem>
          {actions.canDownload ? (
            <DropdownMenuItem onSelect={() => comingSoon("Downloading the signed PDF")}>
              <Download aria-hidden />
              Download signed PDF
            </DropdownMenuItem>
          ) : null}
          {actions.canVoid ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem tone="danger" onSelect={() => setVoidOpen(true)}>
                <Ban aria-hidden />
                Void document
              </DropdownMenuItem>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
      <ConfirmDialog
        open={voidOpen}
        onOpenChange={setVoidOpen}
        title="Void this document?"
        consequences={VOID_CONSEQUENCES}
        confirmLabel="Void document"
        onConfirm={() => {
          setVoidOpen(false);
          comingSoon("Voiding documents");
        }}
      />
    </>
  );
}
