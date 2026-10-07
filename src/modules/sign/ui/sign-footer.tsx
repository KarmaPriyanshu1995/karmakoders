import Link from "next/link";
import { CONTACT_HREF, LEGAL_PAGES } from "@/modules/sign/content/legal";

export const SIGN_FOOTER_LINKS = [
  { href: "/tools/sign", label: "KarmaKoders Sign" },
  { href: "/tools/sign/pricing", label: "Pricing" },
  { href: "/tools/sign/templates", label: "Templates" },
  ...LEGAL_PAGES.map((page) => ({ href: page.href, label: page.label })),
  { href: CONTACT_HREF, label: "Contact" },
] as const;

/** Sign footer strip: product links, all legal pages and contact (spec §6). */
export function SignFooter() {
  return (
    <nav aria-label="KarmaKoders Sign" className="border-t border-white/10 bg-[#1C1B1A] px-6 py-6 md:px-12">
      <ul className="mx-auto flex max-w-5xl flex-wrap gap-x-6 gap-y-2 text-sm">
        {SIGN_FOOTER_LINKS.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="rounded text-[#A39F97] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFC300]"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
      <p className="mx-auto mt-4 max-w-5xl text-xs text-[#A39F97]">
        KarmaKoders Sign provides simple electronic signatures. KarmaKoders is not a law firm.
      </p>
    </nav>
  );
}
