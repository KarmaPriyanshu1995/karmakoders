import type { ReactNode } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/sections/Footer";
import { SignFooter } from "./sign-footer";

/** Site Navbar + content + Sign footer strip + site Footer. Used by /tools/sign marketing and /legal. */
export function MarketingShell({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-screen flex-col bg-[#252422] pt-12 text-white">
      <Navbar />
      <div className="mx-auto w-full max-w-5xl flex-1 px-6 pb-20 pt-28 sm:pb-32 sm:pt-32 md:px-12">{children}</div>
      <SignFooter />
      <Footer />
    </main>
  );
}
