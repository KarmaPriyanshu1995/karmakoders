"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { Check, ChevronRight, FileText, PenLine } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "../../button";
import { DocumentFrame } from "../../document-frame";
import { Alert, EmptyState } from "../../feedback";
import { TypedSignatureTextLazy } from "../../typed-signature-loader";
import type {
  AdoptedSignature,
  FieldValue,
  ReviewVM,
  SignerActionResult,
  SignerFieldVM,
} from "../../signer-view-models";
import type { SignTab } from "./sign-dialog";

/**
 * Document review: the pages as white sheets in DocumentFrame, fit to the width (text sized in
 * container units, so nothing scrolls sideways; pinch-zoom is left to the browser). The signer's
 * required fields are highlighted and labelled; other signers' fields are muted and say so.
 * Phones get a fixed bottom bar ("2 fields left" / Next field / Finish); its room is reserved
 * by SignerShell from the first render, so nothing shifts. The sign dialog (pad + signature
 * fonts) is code-split and loads only when the signer opens it.
 */

const SignDialog = dynamic(() => import("./sign-dialog"), { ssr: false });

export type ReviewActions = {
  /** TODO(Step 9): submit the field values and signature; until then a placeholder. */
  onFinish: (values: Record<string, FieldValue>) => Promise<SignerActionResult>;
  onDecline: () => void;
};

/** Fields the signer must complete themselves (dates are filled in when they sign). */
export function actionableFields(fields: SignerFieldVM[]): SignerFieldVM[] {
  return fields
    .filter((f) => f.mine && f.required && f.type !== "date")
    .sort((a, b) => a.page - b.page || a.y - b.y || a.x - b.x);
}

export function isComplete(field: SignerFieldVM, value: FieldValue | undefined): boolean {
  if (!value) return false;
  if (value.kind === "text") return value.text.trim().length > 0;
  if (value.kind === "checkbox") return value.checked;
  return true;
}

export function fieldsLeftLabel(count: number): string {
  if (count === 0) return "All fields complete";
  return count === 1 ? "1 field left" : `${count} fields left`;
}

function fieldDomId(field: SignerFieldVM) {
  return `signer-field-${field.id}`;
}

const FIELD_BOX = "absolute flex items-center rounded-[0.4cqw] text-left";

function boxStyle(field: SignerFieldVM): React.CSSProperties {
  // At least 44px tall so every target is reachable by touch, whatever the page width.
  return { left: `${field.x}%`, top: `${field.y}%`, width: `${field.w}%`, minHeight: "2.75rem", height: `max(${field.h}%, 2.75rem)` };
}

function SignatureMark({ signature, label }: { signature: AdoptedSignature; label: string }) {
  if (signature.method === "type") {
    return <TypedSignatureTextLazy name={signature.name} font={signature.font} className="truncate text-[length:max(1rem,3.4cqw)] leading-none" />;
  }
  return (
    <Image src={signature.dataUrl} alt={label} width={240} height={60} unoptimized className="h-full max-h-full w-auto max-w-full object-contain" />
  );
}

function FieldOverlay({
  field,
  value,
  onSign,
  onValue,
}: {
  field: SignerFieldVM;
  value: FieldValue | undefined;
  onSign: (field: SignerFieldVM) => void;
  onValue: (field: SignerFieldVM, value: FieldValue) => void;
}) {
  const done = isComplete(field, value);

  if (!field.mine) {
    return (
      <div
        style={boxStyle(field)}
        className={cn(FIELD_BOX, "border border-dashed border-black/30 bg-black/5 px-[1cqw] text-[length:max(10px,1.6cqw)] text-black/70")}
      >
        <span className="truncate">
          {field.label} · Another signer
        </span>
      </div>
    );
  }

  const highlight = done
    ? "border-2 border-emerald-700 bg-emerald-50"
    : "border-2 border-dashed border-[#B38900] bg-[#FFC300]/25";
  const focus = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1C1B1A] focus-visible:ring-offset-2 focus-visible:ring-offset-white";

  if (field.type === "date") {
    return (
      <div style={boxStyle(field)} className={cn(FIELD_BOX, "border border-black/30 bg-white px-[1cqw] text-[length:max(10px,1.6cqw)] text-black/70")}>
        <span className="truncate">{field.label}: added when you sign</span>
      </div>
    );
  }

  if (field.type === "signature" || field.type === "initials") {
    const signature = value?.kind === "signature" ? value.signature : null;
    const verb = field.type === "initials" ? "Initial" : "Sign";
    return (
      <button
        type="button"
        id={fieldDomId(field)}
        data-field-type={field.type}
        data-complete={done || undefined}
        aria-label={signature ? `${field.label}, added. Select to change.` : `${verb}: ${field.label}${field.required ? ", required" : ""}`}
        style={boxStyle(field)}
        onClick={() => onSign(field)}
        className={cn(FIELD_BOX, highlight, focus, "justify-center gap-1 px-[1cqw] text-[#1C1B1A]")}
      >
        {signature ? (
          <SignatureMark signature={signature} label="" />
        ) : (
          <>
            <PenLine aria-hidden className="size-4 shrink-0" />
            <span className="truncate text-sm font-bold">{verb}</span>
          </>
        )}
      </button>
    );
  }

  if (field.type === "checkbox") {
    const checked = value?.kind === "checkbox" && value.checked;
    return (
      <label style={boxStyle(field)} className={cn(FIELD_BOX, highlight, "cursor-pointer gap-2 px-2 text-sm font-semibold text-[#1C1B1A] focus-within:ring-2 focus-within:ring-[#1C1B1A] focus-within:ring-offset-2")}>
        <input
          id={fieldDomId(field)}
          type="checkbox"
          checked={checked}
          required={field.required}
          onChange={(e) => onValue(field, { kind: "checkbox", checked: e.target.checked })}
          className="size-5 shrink-0 accent-[#1C1B1A] focus:outline-none"
        />
        <span className="truncate">{field.label}</span>
      </label>
    );
  }

  const text = value?.kind === "text" ? value.text : "";
  return (
    <input
      id={fieldDomId(field)}
      type="text"
      aria-label={field.label}
      placeholder={field.label}
      required={field.required}
      maxLength={120}
      value={text}
      onChange={(e) => onValue(field, { kind: "text", text: e.target.value })}
      style={boxStyle(field)}
      className={cn(FIELD_BOX, highlight, focus, "px-2 text-base text-[#1C1B1A] placeholder:text-black/60")}
    />
  );
}

function Page({
  page,
  total,
  fields,
  values,
  onSign,
  onValue,
}: {
  page: ReviewVM["pages"][number];
  total: number;
  fields: SignerFieldVM[];
  values: Record<string, FieldValue>;
  onSign: (field: SignerFieldVM) => void;
  onValue: (field: SignerFieldVM, value: FieldValue) => void;
}) {
  return (
    <DocumentFrame label={`Page ${page.number} of ${total}`} className="p-2 sm:p-4" pageClassName="p-0 sm:p-0">
      <div className="@container relative aspect-[8.5/11] w-full overflow-hidden">
        <div className="space-y-[1.6cqw] px-[7cqw] py-[8cqw]">
          {page.blocks.map((block, i) =>
            block.kind === "heading" ? (
              <h2 key={i} className="text-[length:3.4cqw] font-bold leading-tight text-[#1C1B1A]">
                {block.text}
              </h2>
            ) : (
              <p key={i} className="text-[length:2.2cqw] leading-relaxed text-[#1C1B1A]">
                {block.text}
              </p>
            )
          )}
        </div>
        {fields.map((field) => (
          <FieldOverlay key={field.id} field={field} value={values[field.id]} onSign={onSign} onValue={onValue} />
        ))}
        <p className="absolute bottom-[3cqw] right-[5cqw] text-[length:max(9px,1.5cqw)] text-black/60">
          Page {page.number} of {total}
        </p>
      </div>
    </DocumentFrame>
  );
}

export function ReviewScreen({
  vm,
  actions,
  initialValues = {},
  initialDialog = null,
}: {
  vm: ReviewVM;
  actions: ReviewActions;
  /** Preview and tests only. */
  initialValues?: Record<string, FieldValue>;
  initialDialog?: { kind: "signature" | "initials"; tab: SignTab; uploadError?: string } | null;
}) {
  const id = React.useId();
  const [values, setValues] = React.useState<Record<string, FieldValue>>(initialValues);
  const [dialog, setDialog] = React.useState<{ kind: "signature" | "initials"; tab: SignTab; uploadError?: string } | null>(
    initialDialog
  );
  const [dialogLoaded, setDialogLoaded] = React.useState(initialDialog !== null);
  const [announcement, setAnnouncement] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const required = actionableFields(vm.fields);
  const left = required.filter((f) => !isComplete(f, values[f.id]));
  const myFields = vm.fields.filter((f) => f.mine);

  function openSign(field: SignerFieldVM) {
    setDialogLoaded(true);
    setDialog({ kind: field.type === "initials" ? "initials" : "signature", tab: "draw" });
  }

  function setValue(field: SignerFieldVM, value: FieldValue) {
    setValues((prev) => ({ ...prev, [field.id]: value }));
  }

  function adopt(signature: AdoptedSignature) {
    const kind = dialog?.kind ?? "signature";
    const next = { ...values };
    for (const f of myFields) if (f.type === kind) next[f.id] = { kind: "signature", signature };
    setValues(next);
    setDialog(null);
    const remaining = required.filter((f) => !isComplete(f, next[f.id])).length;
    setAnnouncement(`${kind === "initials" ? "Initials" : "Signature"} added. ${fieldsLeftLabel(remaining)}.`);
  }

  function goToNext() {
    const target = left[0];
    if (!target) return;
    const el = document.getElementById(fieldDomId(target));
    if (!el) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    el.scrollIntoView?.({ behavior: reduce ? "auto" : "smooth", block: "center" });
    el.focus({ preventScroll: true });
  }

  async function finish() {
    if (left.length) return goToNext();
    setPending(true);
    setError(null);
    try {
      const result = await actions.onFinish(values);
      if (!result.ok) setError(result.message);
    } catch {
      setError("We couldn't reach KarmaKoders Sign. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  const hasDocument = vm.pages.length > 0;
  const status = fieldsLeftLabel(left.length);
  const primary = left.length ? (
    <Button type="button" size="md" onClick={goToNext} icon={<ChevronRight />}>
      Next field
    </Button>
  ) : (
    <Button type="button" size="md" onClick={finish} loading={pending} loadingText="Finishing…" icon={<Check />}>
      Finish
    </Button>
  );

  return (
    <section aria-labelledby={`${id}-title`} className="min-w-0 space-y-6" data-signer-fields-left={left.length}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 space-y-2">
          <p className="text-xs font-bold uppercase tracking-widest text-[#FFC300]">Review and sign</p>
          <h1 id={`${id}-title`} className="break-words text-2xl font-black tracking-tight text-white sm:text-3xl">
            {vm.context.documentTitle}
          </h1>
          {vm.context.senderName ? (
            <p className="text-sm text-[#A39F97]">
              From <span className="text-white">{vm.context.senderName}</span>
            </p>
          ) : null}
        </div>
        <Button type="button" variant="ghost" className="self-start sm:self-auto" onClick={actions.onDecline}>
          Decline to sign
        </Button>
      </div>

      {vm.context.message ? (
        <Alert tone="info" title={`Message from ${vm.context.senderName ?? "the sender"}`}>
          <p className="whitespace-pre-line break-words">{vm.context.message}</p>
        </Alert>
      ) : null}

      {!hasDocument ? (
        <EmptyState
          icon={FileText}
          title="The document preview isn't available yet"
          description="Reviewing and signing online is coming soon. Nothing has been signed, and you can come back to this link later."
        />
      ) : (
        <>
          <div className="sticky top-0 z-20 hidden items-center justify-between gap-4 rounded-2xl border border-white/10 bg-slate-950/95 px-4 py-3 backdrop-blur-xl md:flex">
            <p className="text-sm font-semibold text-white" aria-hidden>
              {status}
            </p>
            <div className="flex items-center gap-3">{primary}</div>
          </div>

          <ul className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-[#A39F97]" aria-label="Field legend">
            <li className="flex items-center gap-2">
              <span aria-hidden className="size-3 rounded-sm border-2 border-dashed border-[#FFC300] bg-[#FFC300]/25" />
              Yours to complete
            </li>
            <li className="flex items-center gap-2">
              <span aria-hidden className="size-3 rounded-sm border-2 border-emerald-500 bg-emerald-500/20" />
              Completed
            </li>
            <li className="flex items-center gap-2">
              <span aria-hidden className="size-3 rounded-sm border border-dashed border-white/40 bg-white/10" />
              Another signer
            </li>
          </ul>

          <div className="space-y-4">
            {vm.pages.map((page) => (
              <Page
                key={page.number}
                page={page}
                total={vm.pages.length}
                fields={vm.fields.filter((f) => f.page === page.number)}
                values={values}
                onSign={openSign}
                onValue={setValue}
              />
            ))}
          </div>

          {error ? (
            <Alert tone="danger" title="We couldn't finish signing" live action={<Button variant="secondary" onClick={finish}>Try again</Button>}>
              {error}
            </Alert>
          ) : null}

          {/* Phones: fixed bottom bar within thumb reach. SignerShell reserves its height. */}
          <div
            data-testid="signer-bottom-bar"
            className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-slate-950/95 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl md:hidden"
          >
            <div className="mx-auto flex max-w-lg items-center justify-between gap-3">
              <p className="min-w-0 text-sm font-semibold text-white" aria-hidden>
                {status}
              </p>
              {primary}
            </div>
          </div>
        </>
      )}

      <p role="status" aria-live="polite" className="sr-only">
        {announcement || (hasDocument ? status : "")}
      </p>

      {dialogLoaded ? (
        <SignDialog
          key={dialog?.kind ?? "closed"}
          open={dialog !== null}
          onOpenChange={(open) => {
            if (!open) setDialog(null);
          }}
          kind={dialog?.kind ?? "signature"}
          signerName={vm.context.signerName}
          onAdopt={adopt}
          initialTab={dialog?.tab}
          initialUploadError={dialog?.uploadError ?? null}
        />
      ) : null}
    </section>
  );
}
