import { ShieldAlert } from "lucide-react";

/** Persistent PRD §7 disclaimer shown on Sign marketing, template and compose surfaces. */
export function LegalDisclaimer({ className = "" }: { className?: string }) {
  return (
    <aside
      aria-label="Legal disclaimer"
      className={`flex gap-3 rounded-xl border border-white/10 bg-[#1C1B1A] p-4 text-sm text-[#A39F97] ${className}`}
    >
      <ShieldAlert aria-hidden className="mt-0.5 size-4 shrink-0 text-[#FFC300]" />
      <p className="leading-relaxed">
        KarmaKoders Sign provides <strong className="text-white">simple electronic signatures</strong>.
        KarmaKoders is not a law firm and does not give legal advice. You must confirm the document is
        eligible for electronic signature in your jurisdiction before sending.
      </p>
    </aside>
  );
}
