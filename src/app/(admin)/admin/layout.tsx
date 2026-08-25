import { ReactNode } from "react";
// Scoped to /admin only: this stylesheet ships unlayered Tailwind utility
// classes (e.g. .flex-col) that, if loaded globally, silently beat every
// layered utility of the same name across the entire public site because
// CSS @layer rules always lose to unlayered rules regardless of source
// order or specificity.
import "@uploadthing/react/styles.css";

export default function AdminRootLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
