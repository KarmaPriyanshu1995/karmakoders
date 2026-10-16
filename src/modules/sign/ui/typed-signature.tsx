"use client";

import * as React from "react";
import { Caveat, Dancing_Script, Great_Vibes } from "next/font/google";
import { cn } from "@/lib/utils";

/**
 * Typed signature picker. The only module that loads the signature fonts: import it through
 * typed-signature-loader.tsx (next/dynamic) so the fonts stay out of every layout and of pages
 * that do not capture a signature. Guarded by signature-fonts.test.ts.
 */

const dancingScript = Dancing_Script({ subsets: ["latin"], weight: ["400"], display: "swap" });
const greatVibes = Great_Vibes({ subsets: ["latin"], weight: ["400"], display: "swap" });
const caveat = Caveat({ subsets: ["latin"], weight: ["400"], display: "swap" });

export const SIGNATURE_FONTS = [
  { id: "dancing-script", name: "Dancing Script", className: dancingScript.className },
  { id: "great-vibes", name: "Great Vibes", className: greatVibes.className },
  { id: "caveat", name: "Caveat", className: caveat.className },
] as const;

export type SignatureFontId = (typeof SIGNATURE_FONTS)[number]["id"];

export type TypedSignatureProps = {
  /** The signer's name as typed. */
  name: string;
  value: SignatureFontId;
  onChange: (font: SignatureFontId) => void;
  className?: string;
};

/** Radio group of the name rendered in each signature font, on white like the final PDF. */
export default function TypedSignature({ name, value, onChange, className }: TypedSignatureProps) {
  const groupName = React.useId();
  const display = name.trim() || "Your name";
  return (
    <fieldset className={cn("space-y-2", className)}>
      <legend className="text-xs font-bold uppercase tracking-widest text-[#A39F97]">Signature style</legend>
      <div className="grid gap-3 sm:grid-cols-3">
        {SIGNATURE_FONTS.map((font) => {
          const checked = font.id === value;
          return (
            <label
              key={font.id}
              className={cn(
                "relative flex min-h-24 cursor-pointer flex-col justify-between rounded-xl border-2 bg-white p-3 text-[#1C1B1A] focus-within:ring-2 focus-within:ring-[#FFC300] focus-within:ring-offset-2 focus-within:ring-offset-[#252422]",
                checked ? "border-[#FFC300]" : "border-transparent"
              )}
            >
              <input
                type="radio"
                name={groupName}
                value={font.id}
                checked={checked}
                onChange={() => onChange(font.id)}
                className="sr-only"
              />
              <span className={cn(font.className, "truncate text-3xl leading-tight")}>{display}</span>
              <span className="mt-2 flex items-center justify-between text-xs text-black/60">
                {font.name}
                {checked ? <span className="font-semibold text-[#1C1B1A]">Selected</span> : null}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
