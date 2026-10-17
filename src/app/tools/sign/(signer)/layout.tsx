import type { Metadata } from "next";
import type { ReactNode } from "react";
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

/**
 * Signer links: 404 while SIGN_APP_ENABLED is off. Each page renders SignerShell itself, so a
 * page without a valid signer session (invalid link, not yet) never shows a document's branding.
 */
export default function SignSignerLayout({ children }: { children: ReactNode }) {
  requireSignAppEnabledPage();
  return <div className="min-h-dvh bg-[#252422]">{children}</div>;
}
