import { RelatedToolLinks } from "@/components/tools/RelatedToolLinks";

interface ToolContent {
  sections?: { heading: string; body: string }[];
  faq?: { question: string; answer: string }[];
}

export function ToolSeoContent({ content, extraLinks }: { content: ToolContent; extraLinks?: { href: string; label: string; description?: string }[] }) {
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
