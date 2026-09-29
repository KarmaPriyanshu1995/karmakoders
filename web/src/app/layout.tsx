import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "App security scanner",
  description: "A plain-English security check for apps built with AI coding tools.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-stone-50 text-stone-900 antialiased">
        <div className="flex min-h-screen flex-col">
          {children}
          <footer className="mx-auto w-full max-w-2xl px-6 pb-10 text-sm leading-relaxed text-stone-500">
            A scan is not a guarantee of security, and it is not a substitute for a professional
            pentest.
          </footer>
        </div>
      </body>
    </html>
  );
}
