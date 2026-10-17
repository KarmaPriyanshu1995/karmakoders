"use client";

import * as React from "react";
import Image from "next/image";
import { AlertCircle, ImageUp, PenLine, Type } from "lucide-react";
import { formatBytes } from "@/modules/sign/documents/upload-limits";
import { SIGNATURE_IMAGE_MAX_BYTES, SIGNATURE_IMAGE_MIME_TYPES } from "@/modules/sign/signing/constants";
import { Button } from "../../button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "../../dialog";
import { FormField, Input } from "../../form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../tabs";
import { TypedSignatureLazy, TypedSignatureTextLazy } from "../../typed-signature-loader";
import type { AdoptedSignature } from "../../signer-view-models";
import { SignaturePad } from "./signature-pad";

/**
 * Capture a signature: Draw (pointer pad), Type (the full keyboard alternative, code-split
 * fonts) or Upload (PNG/JPG). A dialog from sm up and a bottom sheet on phones. This module is
 * loaded with next/dynamic by the review screen only when the signer opens it, so the pad and
 * the signature fonts never load with the signer layout (signature-fonts.test.ts).
 */

export const INTENT_STATEMENT =
  "By selecting Sign, I agree this electronic signature is the legal equivalent of my handwritten signature.";

export type SignTab = "draw" | "type" | "upload";
type FontId = "dancing-script" | "great-vibes" | "caveat";

export type SignDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** "initials" changes the copy and the typed default. */
  kind?: "signature" | "initials";
  /** The signer's name from the document, used as the typed default. */
  signerName: string;
  onAdopt: (signature: AdoptedSignature) => void;
  /** Preview and tests only. */
  initialTab?: SignTab;
  initialUploadError?: string | null;
  initialUpload?: { dataUrl: string; fileName: string } | null;
};

export function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 3)
    .map((part) => part[0]!.toUpperCase())
    .join("");
}

/** Client-side check before anything is read; the signing API (Step 9) checks again. */
export function checkSignatureImage(file: { type: string; size: number }): string | null {
  if (!(SIGNATURE_IMAGE_MIME_TYPES as readonly string[]).includes(file.type)) return "Choose a PNG or JPG image.";
  if (file.size > SIGNATURE_IMAGE_MAX_BYTES) {
    return `This image is ${formatBytes(file.size)}. The limit is ${formatBytes(SIGNATURE_IMAGE_MAX_BYTES)}.`;
  }
  return null;
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function PreviewBox({ signature, label }: { signature: AdoptedSignature | null; label: string }) {
  return (
    <section aria-labelledby="sign-preview-title" className="space-y-2">
      <h3 id="sign-preview-title" className="text-xs font-bold uppercase tracking-widest text-[#A39F97]">
        Preview
      </h3>
      <div className="flex min-h-24 items-center justify-center rounded-xl bg-white px-4 py-3 text-[#1C1B1A]" aria-live="polite">
        {signature === null ? (
          <span className="text-sm text-black/60">Your {label} will appear here</span>
        ) : signature.method === "type" ? (
          <TypedSignatureTextLazy name={signature.name} font={signature.font} className="truncate text-4xl leading-tight" />
        ) : (
          <Image
            src={signature.dataUrl}
            alt={`Your ${label}`}
            width={320}
            height={80}
            unoptimized
            className="h-auto max-h-20 w-auto max-w-full object-contain"
          />
        )}
      </div>
    </section>
  );
}

export default function SignDialog({
  open,
  onOpenChange,
  kind = "signature",
  signerName,
  onAdopt,
  initialTab = "draw",
  initialUploadError = null,
  initialUpload = null,
}: SignDialogProps) {
  const id = React.useId();
  const label = kind === "initials" ? "initials" : "signature";
  const [tab, setTab] = React.useState<SignTab>(initialTab);
  const [drawn, setDrawn] = React.useState<string | null>(null);
  const [typedName, setTypedName] = React.useState(kind === "initials" ? initialsOf(signerName) : signerName);
  const [font, setFont] = React.useState<FontId>("dancing-script");
  const [upload, setUpload] = React.useState(initialUpload);
  const [uploadError, setUploadError] = React.useState<string | null>(initialUploadError);
  const [error, setError] = React.useState<string | null>(null);

  const pending: AdoptedSignature | null =
    tab === "draw"
      ? drawn
        ? { method: "draw", dataUrl: drawn }
        : null
      : tab === "type"
        ? typedName.trim()
          ? { method: "type", name: typedName.trim(), font }
          : null
        : upload
          ? { method: "upload", ...upload }
          : null;

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const problem = checkSignatureImage(file);
    if (problem) {
      setUploadError(problem);
      setUpload(null);
      return;
    }
    try {
      setUpload({ dataUrl: await readAsDataUrl(file), fileName: file.name });
      setUploadError(null);
    } catch {
      setUploadError("We couldn't read that image. Try another file.");
    }
  }

  function sign() {
    if (!pending) {
      setError(
        tab === "draw"
          ? `Draw your ${label} first, or choose Type or Upload.`
          : tab === "type"
            ? `Type your ${label} first.`
            : `Upload an image of your ${label} first.`
      );
      return;
    }
    setError(null);
    onAdopt(pending);
  }

  const intentId = `${id}-intent`;
  const errorId = `${id}-error`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent layout="sheet" className="space-y-5 sm:max-w-xl" aria-describedby={`${id}-desc`}>
        <div>
          <DialogTitle>{kind === "initials" ? "Add your initials" : "Add your signature"}</DialogTitle>
          <DialogDescription id={`${id}-desc`}>
            Draw, type or upload your {label}. It&apos;s added to every {label} field that&apos;s yours.
          </DialogDescription>
        </div>

        <Tabs
          value={tab}
          onValueChange={(v) => {
            setTab(v as SignTab);
            setError(null);
          }}
        >
          <TabsList aria-label={`How to add your ${label}`} className="grid w-full grid-cols-3">
            <TabsTrigger value="draw" className="gap-1.5 px-2">
              <PenLine aria-hidden className="size-4" />
              Draw
            </TabsTrigger>
            <TabsTrigger value="type" className="gap-1.5 px-2">
              <Type aria-hidden className="size-4" />
              Type
            </TabsTrigger>
            <TabsTrigger value="upload" className="gap-1.5 px-2">
              <ImageUp aria-hidden className="size-4" />
              Upload
            </TabsTrigger>
          </TabsList>

          <TabsContent value="draw" className="mt-4">
            <SignaturePad label={`Draw your ${label}`} onChange={setDrawn} />
          </TabsContent>

          <TabsContent value="type" className="mt-4 space-y-4">
            <FormField label={kind === "initials" ? "Your initials" : "Your full name"}>
              <Input
                value={typedName}
                autoComplete={kind === "initials" ? "off" : "name"}
                maxLength={kind === "initials" ? 5 : 80}
                onChange={(e) => setTypedName(e.target.value)}
              />
            </FormField>
            <TypedSignatureLazy name={typedName} value={font} onChange={(f) => setFont(f)} />
          </TabsContent>

          <TabsContent value="upload" className="mt-4 space-y-3">
            <FormField
              label="Image of your signature"
              hint={`PNG or JPG, up to ${formatBytes(SIGNATURE_IMAGE_MAX_BYTES)}. A dark signature on a white or clear background works best.`}
              error={uploadError ?? undefined}
            >
              <Input
                type="file"
                accept={SIGNATURE_IMAGE_MIME_TYPES.join(",")}
                onChange={onFile}
                className="h-auto py-2.5 file:mr-3 file:rounded-lg file:border-0 file:bg-[#FFC300] file:px-3 file:py-1.5 file:text-sm file:font-bold file:text-[#1C1B1A]"
              />
            </FormField>
            {upload ? <p className="break-all text-sm text-[#A39F97]">Selected: {upload.fileName}</p> : null}
          </TabsContent>
        </Tabs>

        <PreviewBox signature={pending} label={label} />

        {error ? (
          <p id={errorId} role="alert" className="flex items-start gap-1.5 text-sm text-rose-300">
            <AlertCircle aria-hidden className="mt-0.5 size-4 shrink-0" />
            {error}
          </p>
        ) : null}

        <div data-testid="sign-action" className="flex flex-col gap-3 border-t border-white/10 pt-4 sm:flex-row sm:items-center">
          <p id={intentId} className="text-sm leading-relaxed text-[#A39F97] sm:flex-1">
            {INTENT_STATEMENT}
          </p>
          <Button
            type="button"
            size="lg"
            className="w-full shrink-0 sm:w-auto"
            aria-describedby={error ? `${intentId} ${errorId}` : intentId}
            onClick={sign}
          >
            Sign
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
