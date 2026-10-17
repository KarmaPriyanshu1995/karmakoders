import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { SENSITIVE_PAGE_ROBOTS } from "@/platform/privacy/sensitive-paths";
import { requireSignAppEnabledPage } from "@/modules/sign/launch/server";
import { NOINDEX_OPEN_GRAPH } from "@/modules/sign/seo";

/**
 * No canonical / OG URL here: signer URLs carry a bearer token. The openGraph override replaces
 * the root layout's one, whose og:url would otherwise be inherited.
 */
export const metadata: Metadata = {
  title: "Sign document | KarmaKoders Sign",
  description: "Review and e-sign a document. No account required.",
  robots: SENSITIVE_PAGE_ROBOTS,
  referrer: "no-referrer",
  openGraph: NOINDEX_OPEN_GRAPH,
};

/** Signer links: 404 while SIGN_APP_ENABLED is off. */
export default function SignSignerLayout({ children }: { children: ReactNode }) {
  requireSignAppEnabledPage();
  return (
    <div className="flex min-h-screen flex-col bg-[#252422] font-[family-name:var(--font-inter)] text-white">
      {/* Minimal on purpose: no site navigation between the signer and the document. */}
      <header className="border-b border-white/10 bg-slate-950/90">
        <div className="mx-auto flex h-14 w-full max-w-3xl items-center px-4 sm:px-6">
          <Link
            href="/tools/sign"
            className="flex min-h-11 items-center gap-2 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFC300] focus-visible:ring-offset-2 focus-visible:ring-offset-[#252422]"
          >
            <span className="text-lg font-bold tracking-tighter text-white">Karmakoders</span>
            <span className="rounded-md border border-[#FFC300]/30 bg-[#FFC300]/10 px-2 py-0.5 text-xs font-bold uppercase tracking-widest text-[#FFC300]">
              Sign
            </span>
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-8">{children}</main>
      <footer className="px-6 py-4 text-center text-xs text-[#A39F97]">
        Simple electronic signatures · Not a law firm
      </footer>
    </div>
  );
}
