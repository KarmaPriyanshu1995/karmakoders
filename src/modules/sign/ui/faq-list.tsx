import Link from "next/link";
import { ChevronDown } from "lucide-react";

export type FaqItem = {
  question: string;
  answer: string;
  link?: { href: string; label: string };
};

/**
 * FAQ accordion using native <details>/<summary>: keyboard accessible, no client JS, and the
 * answers are always in the server HTML (matching the FAQPage JSON-LD for search engines).
 */
export function FaqList({ items, idPrefix }: { items: readonly FaqItem[]; idPrefix: string }) {
  return (
    <div className="divide-y divide-white/10 border-y border-white/10">
      {items.map((item, index) => (
        <details key={item.question} id={`${idPrefix}-${index}`} className="group">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded py-4 text-left font-medium text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFC300] [&::-webkit-details-marker]:hidden">
            {item.question}
            <ChevronDown aria-hidden className="size-4 shrink-0 text-[#A39F97] transition-transform group-open:rotate-180" />
          </summary>
          <div className="pb-4 text-sm leading-relaxed text-[#A39F97]">
            {item.answer}
            {item.link ? (
              <>
                {" "}
                <Link href={item.link.href} className="text-[#FFC300] underline underline-offset-4">
                  {item.link.label}
                </Link>
              </>
            ) : null}
          </div>
        </details>
      ))}
    </div>
  );
}
