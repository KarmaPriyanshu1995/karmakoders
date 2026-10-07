import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { requireSignAppEnabledPage } from "@/modules/sign/launch/server";

export const metadata: Metadata = {
  title: "Sign dashboard | KarmaKoders Sign",
  description: "Manage your KarmaKoders Sign documents, billing, and sends.",
  robots: { index: false, follow: false },
};

/** Dashboard, compose, documents, billing, settings: 404 while SIGN_APP_ENABLED is off. */
export default function SignAppLayout({ children }: { children: ReactNode }) {
  requireSignAppEnabledPage();
  return (
    <div className="min-h-screen bg-[#252422] text-white flex flex-col">
      <header className="border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <Link href="/tools/sign" className="font-bold tracking-tight">
          <span className="text-white">Karma</span>
          <span className="text-[#FFC300]">Koders</span>
          <span className="text-[#A39F97] font-medium ml-2">Sign</span>
        </Link>
      </header>
      <main className="flex-1 px-6 py-10 max-w-5xl mx-auto w-full">{children}</main>
      <footer className="border-t border-white/10 px-6 py-4 text-xs text-[#A39F97] text-center">
        © {new Date().getFullYear()} KarmaKoders Sign
      </footer>
    </div>
  );
}
