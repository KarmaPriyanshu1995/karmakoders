import type { ReactNode } from "react";
import { MarketingShell } from "@/modules/sign/ui/marketing-shell";

/** /legal/* pages share the Sign marketing shell (site Navbar/Footer + Sign footer strip). */
export default function LegalLayout({ children }: { children: ReactNode }) {
  return <MarketingShell>{children}</MarketingShell>;
}
