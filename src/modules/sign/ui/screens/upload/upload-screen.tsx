"use client";

import * as React from "react";
import Link from "next/link";
import { DndContext, PointerSensor, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { ArrowLeft, Calendar, CheckSquare, FileText, FileUp, PenLine, Signature, Trash2, Type, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatBytes } from "@/modules/sign/documents/upload-limits";
import { Button, IconButton } from "../../button";
import { initialsFrom } from "../../display";
import { Alert } from "../../feedback";
import { LegalDisclaimer } from "../../legal-disclaimer";
import { signerColor } from "../../signer-colors";
import type { UploadVM } from "../../view-models";
import { PageHeader, TEXT_LINK } from "../parts";
import { comingSoon } from "../placeholder-actions";
import {
  FIELD_LABELS,
  FIELD_SIZE,
  FIELD_TYPES,
  clampPosition,
  nextDefaultPosition,
  signersMissingSignature,
  validatePdfFile,
  type FieldType,
  type PlacedField,
  type UploadedFile,
} from "./upload-state";

const FIELD_ICONS: Record<FieldType, LucideIcon> = {
  signature: Signature,
  initials: PenLine,
  date: Calendar,
  text: Type,
  checkbox: CheckSquare,
};

/** Mock page count until the PDF is parsed. TODO(Step 7): real page count and page images. */
const MOCK_PAGES = 3;

const FOCUS = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFC300] focus-visible:ring-offset-2 focus-visible:ring-offset-[#252422]";

function DropZone({ maxBytes, error, onFile }: { maxBytes: number; error: string | null; onFile: (file: File) => void }) {
  const [over, setOver] = React.useState(false);
  return (
    <div className="space-y-3">
      <label
        htmlFor="pdf-upload"
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          const file = e.dataTransfer.files?.[0];
          if (file) onFile(file);
        }}
        className={cn(
          "flex cursor-pointer flex-col items-center gap-4 rounded-2xl border-2 border-dashed px-6 py-14 text-center transition-colors focus-within:ring-2 focus-within:ring-[#FFC300] focus-within:ring-offset-2 focus-within:ring-offset-[#252422] motion-reduce:transition-none",
          over ? "border-[#FFC300] bg-[#FFC300]/5" : "border-white/25 hover:border-white/50",
          error && "border-rose-400"
        )}
      >
        <span className="flex size-12 items-center justify-center rounded-xl border border-[#FFC300]/20 bg-[#FFC300]/10 text-[#FFC300]">
          <FileUp aria-hidden className="size-5" />
        </span>
        <span className="space-y-1">
          <span className="block text-lg font-bold text-white">Drop your PDF here, or choose a file</span>
          <span className="block text-sm text-[#A39F97]">PDF only, up to {formatBytes(maxBytes)}. It stays on this device until you send.</span>
        </span>
        <span className="inline-flex min-h-11 items-center rounded-xl border border-white/15 bg-white/5 px-5 text-sm font-bold text-white">
          Choose a PDF
        </span>
        <input
          id="pdf-upload"
          type="file"
          accept="application/pdf,.pdf"
          className="sr-only"
          aria-describedby={error ? "pdf-upload-error" : undefined}
          aria-invalid={error ? true : undefined}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onFile(file);
            e.target.value = "";
          }}
        />
      </label>
      {error ? (
        <p id="pdf-upload-error" role="alert" className="text-sm text-rose-300">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function PaletteItem({
  type,
  armed,
  onArm,
}: {
  type: FieldType;
  armed: boolean;
  onArm: (type: FieldType) => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: `palette:${type}`, data: { type } });
  const Icon = FIELD_ICONS[type];
  return (
    <button
      {...listeners}
      {...attributes}
      // A toggle button for tap-to-place; dnd-kit adds drag on pointer devices only.
      role={undefined}
      aria-roledescription={undefined}
      aria-describedby={undefined}
      ref={setNodeRef}
      type="button"
      aria-pressed={armed}
      onClick={() => onArm(type)}
      className={cn(
        "flex min-h-11 w-full touch-none items-center gap-2 rounded-xl border px-3 text-left text-sm font-semibold transition-colors motion-reduce:transition-none",
        FOCUS,
        armed ? "border-[#FFC300] bg-[#FFC300]/10 text-white" : "border-white/15 bg-white/5 text-white hover:bg-white/10",
        isDragging && "opacity-60"
      )}
    >
      <Icon aria-hidden className="size-4 text-[#FFC300]" />
      {FIELD_LABELS[type]}
    </button>
  );
}

type SignerLike = UploadVM["signers"][number];

function FieldChip({ field, signer, signerIndex }: { field: PlacedField; signer: SignerLike; signerIndex: number }) {
  const color = signerColor(signerIndex);
  const size = FIELD_SIZE[field.type];
  return (
    <div
      data-field-id={field.id}
      className={cn("absolute flex items-center gap-1 overflow-hidden rounded border-2 px-1 text-[11px] font-bold leading-tight", color.classes)}
      style={{ left: `${field.x}%`, top: `${field.y}%`, width: `${size.w}%`, height: `${size.h}%`, minHeight: 20 }}
    >
      <span className="shrink-0">{initialsFrom(signer.name)}</span>
      {field.type === "checkbox" ? null : <span className="truncate">· {FIELD_LABELS[field.type]}</span>}
      <span className="sr-only">
        {FIELD_LABELS[field.type]} field for {signer.name}
      </span>
    </div>
  );
}

function PdfPage({
  page,
  fields,
  signers,
  armedType,
  onTap,
}: {
  page: number;
  fields: PlacedField[];
  signers: SignerLike[];
  armedType: FieldType | null;
  onTap: (page: number, x: number, y: number) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `page:${page}`, data: { page } });
  return (
    <div
      ref={setNodeRef}
      data-page={page}
      aria-label={`Page ${page}`}
      role="group"
      onClick={(e) => {
        if (!armedType) return;
        const rect = e.currentTarget.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;
        onTap(page, ((e.clientX - rect.left) / rect.width) * 100, ((e.clientY - rect.top) / rect.height) * 100);
      }}
      className={cn(
        "relative aspect-[8.5/11] w-full rounded-md bg-white shadow-xl",
        armedType && "cursor-crosshair",
        isOver && "ring-4 ring-[#FFC300]"
      )}
    >
      {/* Mock page content: grey lines like text. TODO(Step 7): render the real PDF page. */}
      <div aria-hidden className="absolute inset-[8%] space-y-[3%]">
        <div className="h-[3%] w-1/2 rounded bg-black/20" />
        {Array.from({ length: 14 }, (_, i) => (
          <div key={i} className="h-[1.6%] rounded bg-black/10" style={{ width: `${70 + ((i * 37) % 30)}%` }} />
        ))}
      </div>
      <span aria-hidden className="absolute bottom-2 right-3 text-xs text-black/50">
        {page}
      </span>
      {fields
        .filter((f) => f.page === page)
        .map((field) => {
          const index = signers.findIndex((s) => s.id === field.signerId);
          return index >= 0 ? <FieldChip key={field.id} field={field} signer={signers[index]} signerIndex={index} /> : null;
        })}
    </div>
  );
}

export function UploadScreen({
  vm,
  initialFile = null,
  initialFields = [],
}: {
  vm: UploadVM;
  /** Preview and tests: start with a file already chosen. */
  initialFile?: UploadedFile | null;
  initialFields?: PlacedField[];
}) {
  const [file, setFile] = React.useState<UploadedFile | null>(initialFile);
  const [error, setError] = React.useState<string | null>(null);
  const [fields, setFields] = React.useState<PlacedField[]>(initialFields);
  const [signerId, setSignerId] = React.useState(vm.signers[0]?.id ?? "");
  const [armedType, setArmedType] = React.useState<FieldType | null>(null);
  const [announcement, setAnnouncement] = React.useState("");
  const [showMissing, setShowMissing] = React.useState(false);
  const nextId = React.useRef(initialFields.length + 1);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const signer = vm.signers.find((s) => s.id === signerId) ?? vm.signers[0];
  const missing = signersMissingSignature(vm.signers, fields);

  function choose(chosen: File) {
    const problem = validatePdfFile(chosen, vm.maxBytes);
    setError(problem);
    if (!problem) setFile({ name: chosen.name, size: chosen.size, pages: MOCK_PAGES });
  }

  function place(type: FieldType, page: number, x: number, y: number) {
    if (!signer) return;
    const pos = clampPosition(type, x, y);
    const field: PlacedField = { id: `field-${nextId.current++}`, type, signerId: signer.id, page, ...pos };
    setFields((current) => [...current, field]);
    setAnnouncement(`${FIELD_LABELS[type]} field for ${signer.name} placed on page ${page}.`);
  }

  function onDragEnd(event: DragEndEvent) {
    const type = event.active.data.current?.type as FieldType | undefined;
    const page = event.over?.data.current?.page as number | undefined;
    const dropped = event.active.rect.current.translated;
    if (!type || !page || !event.over || !dropped) return;
    const target = event.over.rect;
    place(type, page, ((dropped.left - target.left) / target.width) * 100, ((dropped.top - target.top) / target.height) * 100);
  }

  function remove(field: PlacedField) {
    setFields((current) => current.filter((f) => f.id !== field.id));
    const owner = vm.signers.find((s) => s.id === field.signerId);
    setAnnouncement(`Removed ${FIELD_LABELS[field.type]} field for ${owner?.name ?? "signer"} on page ${field.page}.`);
  }

  const back = (
    <Link href="/tools/sign/new" className={`${TEXT_LINK} inline-flex min-h-11 items-center gap-1 text-sm`}>
      <ArrowLeft aria-hidden className="size-4" />
      All templates
    </Link>
  );

  if (!file) {
    return (
      <div className="space-y-8">
        {back}
        <PageHeader title="Upload your own PDF" description="Upload the document, then place where each signer signs." />
        <DropZone maxBytes={vm.maxBytes} error={error} onFile={choose} />
        <LegalDisclaimer />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {back}
      <PageHeader
        title="Place signature fields"
        description="Choose a signer and a field, then drag it onto the page, or tap the page to place it."
      />
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-white/10 bg-[#1C1B1A] p-3 text-sm">
        <FileText aria-hidden className="size-4 text-[#FFC300]" />
        <span className="min-w-0 break-all font-semibold text-white">{file.name}</span>
        <span className="text-[#A39F97]">
          {formatBytes(file.size)} · {file.pages} pages
        </span>
        <Button
          size="sm"
          variant="ghost"
          className="ml-auto"
          onClick={() => {
            setFile(null);
            setFields([]);
          }}
        >
          Choose a different PDF
        </Button>
      </div>

      <DndContext sensors={sensors} onDragEnd={onDragEnd}>
        <div className="grid gap-6 lg:grid-cols-[16rem_1fr]">
          <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start" aria-label="Field palette">
            <fieldset className="space-y-2">
              <legend className="mb-2 text-xs font-bold uppercase tracking-widest text-[#A39F97]">Signers</legend>
              {vm.signers.map((s, index) => {
                const color = signerColor(index);
                const count = fields.filter((f) => f.signerId === s.id).length;
                return (
                  <label
                    key={s.id}
                    className={cn(
                      "flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border px-3 py-2 text-sm focus-within:ring-2 focus-within:ring-[#FFC300]",
                      s.id === signer?.id ? "border-[#FFC300] bg-white/5" : "border-white/10"
                    )}
                  >
                    <input
                      type="radio"
                      name="active-signer"
                      value={s.id}
                      checked={s.id === signer?.id}
                      onChange={() => setSignerId(s.id)}
                      className="size-4 accent-[#FFC300]"
                    />
                    <span aria-hidden className={cn("flex size-7 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold", color.classes)}>
                      {initialsFrom(s.name)}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-semibold text-white">{s.name}</span>
                      <span className="block text-xs text-[#A39F97]">{count === 1 ? "1 field" : `${count} fields`}</span>
                    </span>
                  </label>
                );
              })}
            </fieldset>

            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-widest text-[#A39F97]">Fields</p>
              <div className="grid grid-cols-2 gap-2 lg:grid-cols-1">
                {FIELD_TYPES.map((type) => (
                  <PaletteItem key={type} type={type} armed={armedType === type} onArm={(t) => setArmedType((cur) => (cur === t ? null : t))} />
                ))}
              </div>
              <p className="text-sm text-[#A39F97]">
                {armedType && signer
                  ? `Tap a page to place a ${FIELD_LABELS[armedType].toLowerCase()} field for ${signer.name}.`
                  : "Pick a field, then tap a page. On a computer you can also drag it."}
              </p>
            </div>
          </aside>

          <div className="space-y-6 rounded-2xl border border-white/10 bg-[#1C1B1A] p-3 sm:p-6">
            {Array.from({ length: file.pages }, (_, i) => i + 1).map((page) => (
              <div key={page} className="mx-auto max-w-[816px] space-y-2">
                <PdfPage
                  page={page}
                  fields={fields}
                  signers={vm.signers}
                  armedType={armedType}
                  onTap={(p, x, y) => armedType && place(armedType, p, x, y)}
                />
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={!armedType}
                    onClick={() => {
                      if (!armedType) return;
                      const pos = nextDefaultPosition(fields, page, armedType);
                      place(armedType, page, pos.x, pos.y);
                    }}
                  >
                    {armedType ? `Place ${FIELD_LABELS[armedType].toLowerCase()} on page ${page}` : `Pick a field to place on page ${page}`}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </DndContext>

      <p role="status" aria-live="polite" className="sr-only">
        {announcement}
      </p>

      <section aria-labelledby="placed-heading" className="space-y-3">
        <h2 id="placed-heading" className="text-2xl font-black tracking-tight text-white">
          Placed fields
        </h2>
        {fields.length === 0 ? (
          <p className="text-sm text-[#A39F97]">No fields yet. Each signer needs at least one signature field.</p>
        ) : (
          <ul className="divide-y divide-white/10 rounded-2xl border border-white/10 bg-white/5">
            {fields.map((field) => {
              const index = vm.signers.findIndex((s) => s.id === field.signerId);
              const owner = vm.signers[index];
              if (!owner) return null;
              return (
                <li key={field.id} className="flex items-center justify-between gap-3 px-4 py-2 text-sm">
                  <span className="flex min-w-0 items-center gap-2">
                    <span aria-hidden className={cn("flex size-7 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold", signerColor(index).classes)}>
                      {initialsFrom(owner.name)}
                    </span>
                    <span className="min-w-0 truncate text-white">
                      {FIELD_LABELS[field.type]} · {owner.name} · page {field.page}
                    </span>
                  </span>
                  <IconButton aria-label={`Remove ${FIELD_LABELS[field.type].toLowerCase()} field for ${owner.name} on page ${field.page}`} onClick={() => remove(field)}>
                    <Trash2 />
                  </IconButton>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {showMissing && missing.length > 0 ? (
        <Alert tone="danger" live title="Add a signature field for every signer">
          Missing: {missing.map((s) => s.name).join(", ")}.
        </Alert>
      ) : null}

      <div className="flex flex-wrap justify-end gap-3 border-t border-white/10 pt-6">
        <Button
          onClick={() => {
            if (missing.length > 0) {
              setShowMissing(true);
              return;
            }
            comingSoon("Sending uploaded PDFs");
          }}
        >
          Continue
        </Button>
      </div>
    </div>
  );
}
