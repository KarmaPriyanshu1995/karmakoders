import Link from "next/link";
import type { FormatMeta, PostType } from "@/types/content";
import { defaultCta, usesNewsletterSignup } from "@/lib/content/post-types";
import { NewsletterCta } from "@/components/content/NewsletterSubscribeForm";

export function FormatCta({ type, meta = {} }: { type: PostType; meta?: FormatMeta }) {
  const cta = defaultCta(type, meta);
  const newsletter = usesNewsletterSignup(type, meta);
  const external = cta.href.startsWith("http");

  if (newsletter) {
    return (
      <div className="mt-16">
        <NewsletterCta heading={cta.heading} body={cta.body} submitLabel={cta.label} />
      </div>
    );
  }

  return (
    <div className="relative mt-16 overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] p-8 md:p-10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,195,0,0.08),transparent_55%)]" />
      <div className="relative">
        <p className="mb-3 text-xs font-bold uppercase tracking-widest text-[#FFC300]">Next step</p>
        <h2 className="text-2xl font-black tracking-tight text-white md:text-3xl">{cta.heading}</h2>
        <p className="mt-3 max-w-2xl leading-relaxed text-slate-400">{cta.body}</p>
        {external ? (
          <a
            href={cta.href}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-flex rounded-xl bg-[#FFC300] px-6 py-3 font-black text-[#1C1B1A] transition-all hover:bg-[#FFD60A]"
          >
            {cta.label}
          </a>
        ) : (
          <Link
            href={cta.href}
            className="mt-6 inline-flex rounded-xl bg-[#FFC300] px-6 py-3 font-black text-[#1C1B1A] transition-all hover:bg-[#FFD60A]"
          >
            {cta.label}
          </Link>
        )}
      </div>
    </div>
  );
}
