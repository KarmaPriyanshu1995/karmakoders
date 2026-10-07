import { Ban } from "lucide-react";
import { BLOCKED_DOCUMENT_TYPES } from "@/modules/sign/templates";

/** Lists document types Sign refuses (PRD §7). Shown before Continue on every template. */
export function BlockedTypesNotice({ className = "" }: { className?: string }) {
  return (
    <section
      aria-labelledby="blocked-types-heading"
      className={`rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm ${className}`}
    >
      <h2
        id="blocked-types-heading"
        className="flex items-center gap-2 font-semibold text-amber-200"
      >
        <Ban aria-hidden className="size-4" />
        Not supported in KarmaKoders Sign
      </h2>
      <ul className="mt-2 list-disc space-y-1 pl-6 text-[#A39F97]">
        {BLOCKED_DOCUMENT_TYPES.map((type) => (
          <li key={type}>{type}</li>
        ))}
      </ul>
    </section>
  );
}
