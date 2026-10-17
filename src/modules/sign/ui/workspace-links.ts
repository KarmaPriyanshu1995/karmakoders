/** Logged-in app sections, shared by the header nav and the account menu. */
export const WORKSPACE_LINKS = [
  { href: "/tools/sign/documents", label: "Documents" },
  { href: "/tools/sign/new", label: "Templates" },
  { href: "/tools/sign/billing", label: "Billing" },
  { href: "/tools/sign/settings", label: "Settings" },
] as const;

/** Whole-segment match, so /tools/sign/new/mutual-nda marks Templates and /tools/sign/newx does not. */
export function isActiveSection(pathname: string | null, href: string): boolean {
  if (!pathname) return false;
  return pathname === href || pathname.startsWith(`${href}/`);
}
