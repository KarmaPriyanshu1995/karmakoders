"use client";

import * as React from "react";
import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TemplateField } from "@/modules/sign/templates/catalog";
import { DocumentFrame } from "../../document-frame";
import { FormField, Input, Textarea } from "../../form";
import type { BuilderTemplateVM } from "../../view-models";
import type { FieldErrors, SignerDraft } from "./builder-state";

export type SaveState = "idle" | "saving" | "saved";

/** Autosave indicator. TODO(Step 7): reflects the real draft save instead of a timer. */
export function SaveIndicator({ state }: { state: SaveState }) {
  return (
    <p role="status" aria-live="polite" className="inline-flex min-h-6 items-center gap-1.5 text-sm text-[#A39F97]">
      {state === "saving" ? (
        <>
          <Loader2 aria-hidden className="size-4 animate-spin motion-reduce:animate-none" />
          Saving…
        </>
      ) : state === "saved" ? (
        <>
          <Check aria-hidden className="size-4 text-emerald-400" />
          Saved
        </>
      ) : null}
    </p>
  );
}

/** FormField passes id, required and aria-* props here; they go on the real control. */
function FieldControl({
  field,
  value,
  onChange,
  ...aria
}: {
  field: TemplateField;
  value: string;
  onChange: (value: string) => void;
  id?: string;
  required?: boolean;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean | "true" | "false";
  "aria-required"?: boolean | "true" | "false";
}) {
  if (field.type === "textarea") {
    return <Textarea {...aria} name={field.key} value={value} onChange={(e) => onChange(e.target.value)} rows={3} />;
  }
  const type = field.type === "number" ? "text" : field.type;
  return (
    <Input
      {...aria}
      name={field.key}
      type={type}
      inputMode={field.type === "number" ? "numeric" : undefined}
      autoComplete={field.type === "email" ? "email" : "off"}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

/** Live preview: a white page like the final PDF, with the values typed so far. */
export function BuilderPreview({
  template,
  values,
  signers,
}: {
  template: BuilderTemplateVM;
  values: Record<string, string>;
  signers: SignerDraft[];
}) {
  return (
    <DocumentFrame label={`${template.name} preview`}>
      <p className="text-xs font-semibold uppercase tracking-widest text-black/60">Your logo here</p>
      <p className="mt-3 text-xl font-bold">{template.name}</p>
      <dl className="mt-6 grid gap-3 text-sm sm:grid-cols-2">
        {template.fields.map((field) => {
          const value = values[field.key]?.trim();
          return (
            <div key={field.key} className={field.type === "textarea" ? "sm:col-span-2" : undefined}>
              <dt className="text-xs uppercase tracking-wide text-black/60">{field.label}</dt>
              <dd className={cn("mt-0.5 break-words", value ? "font-medium" : "text-black/40")}>{value || "Not filled in yet"}</dd>
            </div>
          );
        })}
      </dl>
      <div className="mt-10 grid gap-6 sm:grid-cols-2">
        {signers.map((signer) => (
          <div key={signer.id}>
            <div className="h-10 border-b border-black/40" />
            <p className="mt-1 text-xs font-semibold">{signer.role}</p>
            <p className="break-words text-xs text-black/60">{signer.name.trim() || "Signer name"}</p>
          </div>
        ))}
      </div>
    </DocumentFrame>
  );
}

const TOGGLE =
  "inline-flex min-h-11 flex-1 items-center justify-center rounded-lg px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFC300] focus-visible:ring-offset-2 focus-visible:ring-offset-[#252422] motion-reduce:transition-none";

export function DetailsStep({
  template,
  values,
  signers,
  errors,
  onChange,
}: {
  template: BuilderTemplateVM;
  values: Record<string, string>;
  signers: SignerDraft[];
  errors: FieldErrors;
  onChange: (key: string, value: string) => void;
}) {
  const [view, setView] = React.useState<"form" | "preview">("form");

  return (
    <div className="space-y-4">
      <div role="group" aria-label="Show form or preview" className="flex rounded-xl border border-white/10 bg-[#1C1B1A] p-1 lg:hidden">
        {(["form", "preview"] as const).map((v) => (
          <button
            key={v}
            type="button"
            aria-pressed={view === v}
            onClick={() => setView(v)}
            className={cn(TOGGLE, view === v ? "bg-[#FFC300] text-[#1C1B1A]" : "text-white hover:bg-white/10")}
          >
            {v === "form" ? "Form" : "Preview"}
          </button>
        ))}
      </div>
      <div className="grid gap-8 lg:grid-cols-2">
        <div className={cn("space-y-5", view === "preview" && "hidden lg:block")} data-testid="details-form">
          <p className="text-sm text-[#A39F97]">
            Fields marked <span className="text-[#FFC300]">*</span> are required.
          </p>
          {template.fields.map((field) => (
            <FormField key={field.key} label={field.label} required={field.required} error={errors[field.key]}>
              <FieldControl field={field} value={values[field.key] ?? ""} onChange={(v) => onChange(field.key, v)} />
            </FormField>
          ))}
        </div>
        <div className={cn(view === "form" && "hidden lg:block")} data-testid="details-preview">
          <div className="lg:sticky lg:top-24">
            <BuilderPreview template={template} values={values} signers={signers} />
          </div>
        </div>
      </div>
    </div>
  );
}
