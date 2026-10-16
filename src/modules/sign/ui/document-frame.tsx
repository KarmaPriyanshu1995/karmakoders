import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * The one white surface in Sign (docs/DESIGN.md, "Document previews"): the document being
 * created or signed renders as a white page with dark text, like the signed PDF, inside a dark
 * frame. Inside the page use text-[#1C1B1A] and black/* shades only; the site remaps text-white
 * and the slate text classes to light colours, which would vanish on white.
 */
export function DocumentFrame({
  label,
  toolbar,
  children,
  className,
}: {
  /** Accessible name, e.g. "Mutual NDA preview". */
  label: string;
  toolbar?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <figure aria-label={label} className={cn("rounded-2xl border border-white/10 bg-[#1C1B1A] p-3 sm:p-6", className)}>
      {toolbar ? <div className="mb-3 flex flex-wrap items-center justify-between gap-2 sm:mb-4">{toolbar}</div> : null}
      <div className="mx-auto max-w-[816px] rounded-md bg-white p-6 text-[#1C1B1A] shadow-xl sm:p-10">{children}</div>
    </figure>
  );
}
