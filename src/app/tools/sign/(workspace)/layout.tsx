import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { getCurrentCustomer, getCustomerProfile } from "@/platform/auth";
import { requireSignAppEnabledPage } from "@/modules/sign/launch/server";
import { NOINDEX_OPEN_GRAPH } from "@/modules/sign/seo";
import { AccountMenu } from "@/modules/sign/ui/account-menu";
import { CreditBalanceChip } from "@/modules/sign/ui/display";
import { NewDocumentButton, WorkspaceNav } from "@/modules/sign/ui/workspace-nav";
import { logoutAction, logoutAllAction } from "./dashboard/actions";

export const metadata: Metadata = {
  title: "Sign dashboard | KarmaKoders Sign",
  description: "Manage your KarmaKoders Sign documents, billing, and sends.",
  robots: { index: false, follow: false },
  // Noindex: no canonical, and an Open Graph without the root layout's og:url.
  openGraph: NOINDEX_OPEN_GRAPH,
};

/**
 * Logged-in Sign app (dashboard, new/*, documents, billing, settings): a compact header in the
 * site Navbar style with section links, "New document", the credit balance and account menu. 404 while
 * SIGN_APP_ENABLED is off. Each page still calls requireCustomer(); the header only reads.
 * The login page keeps its own (app) layout.
 */
export default async function SignWorkspaceLayout({ children }: { children: ReactNode }) {
  requireSignAppEnabledPage();
  const customer = await getCurrentCustomer();
  const profile = customer ? await getCustomerProfile(customer.id) : null;

  return (
    <div className="flex min-h-screen flex-col bg-[#252422] font-[family-name:var(--font-inter)] text-white">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 md:px-12">
          <Link
            href="/tools/sign/dashboard"
            className="flex min-h-11 items-center gap-2 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFC300] focus-visible:ring-offset-2 focus-visible:ring-offset-[#252422]"
          >
            <span className="text-xl font-bold tracking-tighter text-white">Karmakoders</span>
            <span className="rounded-md border border-[#FFC300]/30 bg-[#FFC300]/10 px-2 py-0.5 text-xs font-bold uppercase tracking-widest text-[#FFC300]">
              Sign
            </span>
          </Link>
          {profile ? <WorkspaceNav /> : null}
          {profile ? (
            <div className="flex items-center gap-2 sm:gap-3">
              <NewDocumentButton />
              {/* Below sm the balance moves into the account menu so the header fits at 360px. */}
              <CreditBalanceChip credits={profile.creditsBalance} className="hidden sm:inline-flex" />
              <AccountMenu email={profile.email} credits={profile.creditsBalance} logoutAction={logoutAction} logoutAllAction={logoutAllAction} />
            </div>
          ) : null}
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6 md:px-12">{children}</main>
      <footer className="border-t border-white/10 px-6 py-4 text-center text-xs text-[#A39F97]">
        © {new Date().getFullYear()} KarmaKoders Sign · Simple electronic signatures · Not a law firm
      </footer>
    </div>
  );
}
