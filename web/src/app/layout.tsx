import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "KarmaKoders Security Scanner",
  description:
    "Evidence-backed security checks for AI-built apps — headers, exposure, TLS, CORS, attack surface, and authorized GitHub scans.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen antialiased" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
