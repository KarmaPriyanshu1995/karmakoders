import type { ReactNode } from "react";
import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SignerBrandVM } from "../../signer-view-models";

/**
 * Chrome for every signer page. Minimal on purpose: no site navigation between the signer and
 * the document, and the wordmark is not a link. Server-safe; it must never import the signature
 * pad, the sign dialog or the signature fonts (signature-fonts.test.ts).
 */

export const SIGNER_FOOTER_LINKS = [
  { href: "/legal/esign-disclosure", label: "E-sign disclosure" },
  { href: "/legal/privacy", label: "Privacy policy" },
] as const;

const FOOTER_LINK =
  "inline-flex min-h-11 items-center rounded px-1 underline-offset-4 hover:text-white hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFC300]";

function Wordmark() {
  return (
    <span className="flex items-center gap-2">
      <span className="text-lg font-bold tracking-tighter text-white">Karmakoders</span>
      <span className="rounded-md border border-[#FFC300]/30 bg-[#FFC300]/10 px-2 py-0.5 text-xs font-bold uppercase tracking-widest text-[#FFC300]">
        Sign
      </span>
    </span>
  );
}

export function SignerShell({
  brand = null,
  width = "narrow",
  reserveBottomBar = false,
  children,
}: {
  /** Sender branding; null on pages that have no valid signer session (invalid link, not yet). */
  brand?: SignerBrandVM | null;
  /** "wide" for the document review; "narrow" for forms and notices. */
  width?: "narrow" | "wide";
  /**
   * Keeps room below the footer for the review screen's fixed bottom bar on phones. Set from the
   * first render (not when the bar appears), so nothing shifts.
   */
  reserveBottomBar?: boolean;
  children: ReactNode;
}) {
  const company = brand?.companyName?.trim() || null;
  return (
    <div
      className={cn(
        "flex min-h-dvh flex-col bg-[#252422] font-[family-name:var(--font-inter)] text-white",
        reserveBottomBar && "pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-0"
      )}
    >
      <header className="border-b border-white/10 bg-slate-950/90">
        <div className="mx-auto flex min-h-14 w-full max-w-5xl items-center justify-between gap-3 px-4 py-2 sm:px-6">
          {company ? (
            <p className="min-w-0 truncate text-base font-bold tracking-tight text-white" title={company}>
              {company}
            </p>
          ) : (
            <Wordmark />
          )}
          <p className="flex shrink-0 items-center gap-1.5 text-xs font-semibold text-[#A39F97]">
            <Lock aria-hidden className="size-3.5 text-[#FFC300]" />
            <span>
              Secured by <span className="text-white">KarmaKoders Sign</span>
            </span>
          </p>
        </div>
      </header>
      <main
        id="main"
        className={cn("mx-auto w-full flex-1 px-4 py-8 sm:px-6", width === "wide" ? "max-w-4xl" : "max-w-lg")}
      >
        {children}
      </main>
      <footer className="border-t border-white/10 px-4 py-3 text-xs text-[#A39F97]">
        <nav aria-label="Signer information" className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-x-4">
          {SIGNER_FOOTER_LINKS.map((link) => (
            <a key={link.href} href={link.href} target="_blank" rel="noopener noreferrer" className={FOOTER_LINK}>
              {link.label}
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          ))}
          <span>Simple electronic signatures · Not a law firm</span>
        </nav>
      </footer>
    </div>
  );
}
