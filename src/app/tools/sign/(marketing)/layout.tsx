import type { ReactNode } from "react";
import { MarketingShell } from "@/modules/sign/ui/marketing-shell";

/** Public Sign pages: site Navbar/Footer plus the Sign footer strip. Each page sets its own metadata. */
export default function SignMarketingLayout({ children }: { children: ReactNode }) {
  return <MarketingShell>{children}</MarketingShell>;
}
