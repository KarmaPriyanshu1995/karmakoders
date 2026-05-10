import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "AI Business Portfolio",
  description: "Premium AI-powered business portfolio platform",
};

import { ThemeProvider } from "@/components/ThemeProvider";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased dark`}>
      <body className="min-h-full flex flex-col bg-slate-950 text-slate-50 selection:bg-indigo-500/30">
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
