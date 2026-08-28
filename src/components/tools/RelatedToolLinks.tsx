import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function RelatedToolLinks({
  links,
}: {
  links: { href: string; label: string; description?: string }[];
}) {
  if (links.length === 0) return null;
  return (
    <aside className="mt-16 rounded-2xl border border-white/10 bg-white/5 p-6 md:p-8">
      <p className="text-xs font-bold uppercase tracking-widest text-indigo-400 mb-4">Related</p>
      <div className="grid gap-4">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="group flex items-start justify-between gap-4 rounded-xl border border-transparent hover:border-indigo-500/30 hover:bg-indigo-500/5 p-3 transition-colors"
          >
            <div>
              <p className="font-semibold text-white group-hover:text-indigo-400 transition-colors">{link.label}</p>
              {link.description && <p className="text-sm text-slate-400 mt-1">{link.description}</p>}
            </div>
            <ArrowRight className="w-4 h-4 mt-1 text-slate-500 group-hover:text-indigo-400 shrink-0" />
          </Link>
        ))}
      </div>
    </aside>
  );
}
