import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { SENSITIVE_PAGE_ROBOTS } from "@/platform/privacy/sensitive-paths";
import { requireSignAppEnabledPage } from "@/modules/sign/launch/server";

/** No canonical / OG URL here: signer URLs carry a bearer token. */
export const metadata: Metadata = {
  title: "Sign document | KarmaKoders Sign",
  description: "Review and e-sign a document. No account required.",
  robots: SENSITIVE_PAGE_ROBOTS,
  referrer: "no-referrer",
};

/** Signer links: 404 while SIGN_APP_ENABLED is off. */
export default function SignSignerLayout({ children }: { children: ReactNode }) {
  requireSignAppEnabledPage();
  return (
    <div className="min-h-screen bg-[#252422] text-white flex flex-col">
      <header className="border-b border-white/10 px-6 py-4">
        <Link href="/tools/sign" className="font-bold tracking-tight text-sm">
          <span className="text-white">Karma</span>
          <span className="text-[#FFC300]">Koders</span>
          <span className="text-[#A39F97] font-medium ml-2">Sign</span>
        </Link>
      </header>
      <main className="flex-1 px-4 py-8 max-w-lg mx-auto w-full">{children}</main>
      <footer className="px-6 py-4 text-xs text-[#A39F97] text-center">
        Simple electronic signatures · Not a law firm
      </footer>
    </div>
  );
}
