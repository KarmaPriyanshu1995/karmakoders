import Link from "next/link";
import type { FormatMeta, PostType } from "@/types/content";
import { defaultCta } from "@/lib/content/post-types";

export function FormatCta({ type, meta }: { type: PostType; meta?: FormatMeta }) {
  const cta = defaultCta(type, meta);
  const external = cta.href.startsWith("http");

  return (
    <div className="mt-16 rounded-3xl border border-indigo-500/20 bg-gradient-to-br from-indigo-500/10 to-transparent p-8 md:p-10">
      <p className="text-xs font-bold uppercase tracking-widest text-indigo-400 mb-3">Next step</p>
      <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight">{cta.heading}</h2>
      <p className="text-slate-300 mt-3 max-w-2xl leading-relaxed">{cta.body}</p>
      {external ? (
        <a
          href={cta.href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex mt-6 px-6 py-3 rounded-xl bg-indigo-500 text-slate-950 font-bold"
        >
          {cta.label}
        </a>
      ) : (
        <Link href={cta.href} className="inline-flex mt-6 px-6 py-3 rounded-xl bg-indigo-500 text-slate-950 font-bold">
          {cta.label}
        </Link>
      )}
    </div>
  );
}
