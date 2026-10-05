import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Security Scanner | KarmaKoders",
  description:
    "Evidence-backed security checks for AI-built apps — headers, exposure, TLS, CORS, attack surface, and authorized GitHub scans.",
  alternates: { canonical: "/security-scanner" },
};

// Scanner pages keep their own dark shell; .scanner-root scopes its tokens and background.
export default function SecurityScannerLayout({ children }: { children: ReactNode }) {
  return <div className="scanner-root min-h-screen antialiased">{children}</div>;
}
