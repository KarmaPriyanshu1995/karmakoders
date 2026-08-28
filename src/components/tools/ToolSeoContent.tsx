import { RelatedToolLinks } from "@/components/tools/RelatedToolLinks";

interface ToolContent {
  sections?: { heading: string; body: string }[];
  faq?: { question: string; answer: string }[];
}

export function ToolSeoContent({
  content,
  extraLinks,
  compact = false,
}: {
  content: ToolContent;
  extraLinks?: { href: string; label: string; description?: string }[];
  compact?: boolean;
}) {
  if (compact) {
    return (
      <div className="mt-16">
        <details className="group rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden">
          <summary className="cursor-pointer px-6 py-5 font-semibold text-white flex items-center justify-between list-none">
            Domain buying guide for founders
            <span className="text-slate-500 text-sm font-normal group-open:hidden">Expand</span>
          </summary>
          <div className="px-6 pb-6 pt-2 space-y-10 border-t border-white/10">
            {content.sections?.slice(0, 4).map((section) => (
              <section key={section.heading}>
                <h2 className="text-lg font-bold text-white mb-3">{section.heading}</h2>
                <div
                  className="prose prose-invert prose-sm max-w-none prose-p:text-slate-400 prose-a:text-indigo-400"
                  dangerouslySetInnerHTML={{ __html: section.body }}
                />
              </section>
            ))}
            {content.faq && content.faq.length > 0 && (
              <section>
                <h2 className="text-lg font-bold text-white mb-4">FAQ</h2>
                <div className="space-y-3">
                  {content.faq.map((item) => (
                    <details key={item.question} className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                      <summary className="cursor-pointer font-medium text-white text-sm">{item.question}</summary>
                      <p className="mt-2 text-slate-400 text-sm leading-relaxed">{item.answer}</p>
                    </details>
                  ))}
                </div>
              </section>
            )}
          </div>
        </details>
        {extraLinks && extraLinks.length > 0 && (
          <div className="mt-8">
            <RelatedToolLinks links={extraLinks} />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="mt-20 space-y-14">
      {content.sections?.map((section) => (
        <section key={section.heading}>
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">{section.heading}</h2>
          <div
            className="prose prose-invert prose-indigo max-w-none prose-p:text-slate-300 prose-a:text-indigo-400"
            dangerouslySetInnerHTML={{ __html: section.body }}
          />
        </section>
      ))}

      {content.faq && content.faq.length > 0 && (
        <section>
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-6">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {content.faq.map((item) => (
              <details key={item.question} className="rounded-xl border border-white/10 bg-white/5 px-5 py-4">
                <summary className="cursor-pointer font-semibold text-white">{item.question}</summary>
                <p className="mt-3 text-slate-400 leading-relaxed">{item.answer}</p>
              </details>
            ))}
          </div>
        </section>
      )}

      {extraLinks && extraLinks.length > 0 && <RelatedToolLinks links={extraLinks} />}
    </div>
  );
}
