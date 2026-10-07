import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SENSITIVE_PAGE_ROBOTS } from "@/platform/privacy/sensitive-paths";

/**
 * Static metadata on purpose: the URL token must never appear in canonical, OG or any
 * other tag. Referrer-Policy: no-referrer is also set as a response header in next.config.ts.
 */
export const metadata: Metadata = {
  title: "Sign document | KarmaKoders Sign",
  description: "Secure signing link. No account required.",
  robots: SENSITIVE_PAGE_ROBOTS,
  referrer: "no-referrer",
};

/** Placeholder until the signer flow is implemented. */
export default async function SignerTokenPlaceholder() {
  notFound();
}
