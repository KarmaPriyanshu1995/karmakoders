import type { ReactNode } from "react";
import Link from "next/link";
import { CONTACT_HREF, LEGAL_DRAFT_COMMENT, LEGAL_LAST_UPDATED, LEGAL_OPERATOR, LEGAL_PAGES } from "@/modules/sign/content/legal";

/** Shared frame for /legal pages: title, "Last updated", operator block and the hidden draft comment. */
export function LegalPage({ title, intro, children }: { title: string; intro: ReactNode; children: ReactNode }) {
  return (
    <article className="space-y-10">
      {/* Hidden HTML comment (spec §4): visible in page source only. */}
      <div hidden dangerouslySetInnerHTML={{ __html: `<!-- ${LEGAL_DRAFT_COMMENT} -->` }} />

      <header className="space-y-3">
        <p className="text-sm font-bold uppercase tracking-widest text-[#FFC300]">KarmaKoders Sign · Legal</p>
        <h1 className="text-3xl font-black tracking-tight text-white md:text-4xl">{title}</h1>
        <p className="text-sm text-[#A39F97]">
          Last updated: <time dateTime={LEGAL_LAST_UPDATED}>{LEGAL_LAST_UPDATED}</time>
        </p>
        <div className="max-w-3xl leading-relaxed text-[#A39F97]">{intro}</div>
      </header>

      <div className="max-w-3xl space-y-8 leading-relaxed text-[#A39F97] [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-white [&_li]:ml-5 [&_li]:list-disc [&_section]:space-y-3 [&_strong]:text-white [&_a]:text-[#FFC300] [&_a]:underline [&_a]:underline-offset-4">
        {children}
      </div>

      <section aria-labelledby="operator-heading" className="max-w-3xl space-y-2 rounded-xl border border-white/10 bg-[#1C1B1A] p-6 text-sm text-[#A39F97]">
        <h2 id="operator-heading" className="text-base font-semibold text-white">
          Who we are
        </h2>
        <p>
          KarmaKoders Sign is operated by <strong className="text-white">{LEGAL_OPERATOR.name}</strong>,{" "}
          {LEGAL_OPERATOR.description}, based in {LEGAL_OPERATOR.city}, {LEGAL_OPERATOR.region}, {LEGAL_OPERATOR.country}.
        </p>
        <p>Registered address: {LEGAL_OPERATOR.address}</p>
        <p>
          Contact:{" "}
          <a href={`mailto:${LEGAL_OPERATOR.email}`} className="text-[#FFC300] underline underline-offset-4">
            {LEGAL_OPERATOR.email}
          </a>{" "}
          (we reply within {LEGAL_OPERATOR.responseTime}) or our{" "}
          <Link href={CONTACT_HREF} className="text-[#FFC300] underline underline-offset-4">
            contact page
          </Link>
          .
        </p>
      </section>

      <nav aria-label="Legal pages" className="max-w-3xl">
        <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
          {LEGAL_PAGES.map((page) => (
            <li key={page.href}>
              <Link href={page.href} className="rounded text-[#A39F97] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFC300]">
                {page.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </article>
  );
}
