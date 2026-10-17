"use client";

import * as React from "react";
import Image from "next/image";
import { ImageUp, X } from "lucide-react";
import { LOGO_MAX_BYTES, LOGO_MIME_TYPES, formatBytes } from "@/modules/sign/documents/upload-limits";
import { Button } from "../button";
import { FormField, Input } from "../form";
import { comingSoon } from "./placeholder-actions";

/** What's wrong with a chosen logo, or null. PNG or SVG, up to 2 MB (PRD S2). */
export function validateLogo(file: { type: string; size: number }): string | null {
  if (!(LOGO_MIME_TYPES as readonly string[]).includes(file.type)) return "Choose a PNG or SVG image.";
  if (file.size > LOGO_MAX_BYTES) return `This image is ${formatBytes(file.size)}. The limit is ${formatBytes(LOGO_MAX_BYTES)}.`;
  return null;
}

const HEX = /^#[0-9a-f]{6}$/i;

/**
 * Company name, logo and brand colour, previewed locally. Nothing is uploaded.
 * TODO(Step 10): save branding (credit and Pro documents only).
 */
export function BrandingForm({ defaultCompany = "" }: { defaultCompany?: string }) {
  const [company, setCompany] = React.useState(defaultCompany);
  const [color, setColor] = React.useState("#FFC300");
  const [logo, setLogo] = React.useState<string | null>(null);
  const [logoError, setLogoError] = React.useState<string | null>(null);

  React.useEffect(() => () => (logo ? URL.revokeObjectURL(logo) : undefined), [logo]);

  function onLogo(file: File | undefined) {
    if (!file) return;
    const problem = validateLogo(file);
    setLogoError(problem);
    if (!problem) setLogo(URL.createObjectURL(file));
  }

  const swatch = HEX.test(color) ? color : "#FFC300";

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        comingSoon("Saving branding");
      }}
    >
      <p className="text-sm text-[#A39F97]">Credit and Pro documents show your branding instead of the KarmaKoders footer.</p>
      <FormField label="Company name" hint="Shown at the top of your documents.">
        <Input value={company} autoComplete="organization" onChange={(e) => setCompany(e.target.value)} />
      </FormField>

      <div className="space-y-2">
        <FormField label="Logo" hint={`PNG or SVG, up to ${formatBytes(LOGO_MAX_BYTES)}.`} error={logoError ?? undefined}>
          <Input type="file" accept="image/png,image/svg+xml" className="h-auto py-2 file:mr-3 file:rounded-lg file:border-0 file:bg-white/10 file:px-3 file:py-1.5 file:text-white" onChange={(e) => onLogo(e.target.files?.[0])} />
        </FormField>
        {logo ? (
          <Button type="button" variant="ghost" size="sm" icon={<X />} onClick={() => setLogo(null)}>
            Remove logo
          </Button>
        ) : null}
      </div>

      <div className="flex items-start gap-3">
        <FormField label="Brand colour" hint="A hex colour, used for lines on your documents." className="max-w-56 flex-1">
          <Input value={color} onChange={(e) => setColor(e.target.value)} className="font-mono" spellCheck={false} />
        </FormField>
        <input
          type="color"
          aria-label="Pick a brand colour"
          value={swatch}
          onChange={(e) => setColor(e.target.value)}
          className="mt-7 h-11 w-14 shrink-0 cursor-pointer rounded-xl border border-white/35 bg-transparent"
        />
      </div>

      <figure aria-label="Branding preview" className="rounded-2xl border border-white/10 bg-[#1C1B1A] p-4">
        <div className="rounded-md bg-white p-5 text-[#1C1B1A]">
          <div className="flex items-center gap-3 border-b-2 pb-3" style={{ borderColor: swatch }}>
            {logo ? (
              <Image src={logo} alt="Your logo" width={160} height={40} unoptimized className="h-10 w-auto max-w-40 object-contain" />
            ) : (
              <span className="flex h-10 items-center rounded border border-dashed border-black/30 px-3 text-xs text-black/60">
                <ImageUp aria-hidden className="mr-1 size-4" />
                Logo
              </span>
            )}
            <span className="break-words text-lg font-bold" style={{ color: "#1C1B1A" }}>
              {company.trim() || "Your company"}
            </span>
          </div>
          <p className="mt-3 text-xs text-black/60">Sample document header</p>
        </div>
      </figure>

      <Button type="submit">Save branding</Button>
    </form>
  );
}
