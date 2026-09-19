"use client";

import Link from "next/link";
import type { ContentBlock } from "@/types/content";
import { MermaidDiagram } from "@/components/content/MermaidDiagram";
import { ToolEmbed } from "@/components/content/ToolEmbed";
import { CopyPromptButton } from "@/components/content/CopyPromptButton";
import { NewsletterCta } from "@/components/content/NewsletterSubscribeForm";

function ListItems({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2">
      {items.filter(Boolean).map((item) => (
        <li key={item} className="text-slate-300 leading-relaxed">
          {item}
        </li>
      ))}
    </ul>
  );
}

export function BlockRenderer({ blocks }: { blocks: ContentBlock[] }) {
  return (
    <div className="space-y-8">
      {blocks.map((block) => {
        switch (block.type) {
          case "HEADING":
            return (
              <h2 key={block.id} className="text-3xl md:text-4xl font-bold text-white tracking-tight">
                {block.text}
              </h2>
            );
          case "SUBHEADING":
            return (
              <h3 key={block.id} className="text-2xl font-semibold text-white">
                {block.text}
              </h3>
            );
          case "PARAGRAPH":
            return (
              <div
                key={block.id}
                className="prose prose-invert prose-indigo max-w-none prose-lg prose-p:leading-relaxed prose-headings:text-white prose-a:text-indigo-400"
                dangerouslySetInnerHTML={{ __html: block.html }}
              />
            );
          case "PRO_TIP":
            return (
              <aside key={block.id} className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5">
                <p className="text-xs font-bold uppercase tracking-widest text-amber-400 mb-2">{block.title}</p>
                <p className="text-slate-200 leading-relaxed">{block.message}</p>
              </aside>
            );
          case "QUOTE":
            return (
              <blockquote key={block.id} className="border-l-2 border-indigo-500 pl-6 text-xl text-slate-200 italic">
                {block.text}
                {block.author && <cite className="block not-italic text-sm text-slate-400 mt-3">— {block.author}</cite>}
              </blockquote>
            );
          case "CODE":
            return (
              <pre key={block.id} className="rounded-2xl border border-white/10 bg-slate-950 p-4 overflow-x-auto text-sm text-slate-200">
                <code>{block.code}</code>
              </pre>
            );
          case "TOOL_EMBED":
            return <ToolEmbed key={block.id} tool={block.tool} />;
          case "MERMAID":
            return <MermaidDiagram key={block.id} chart={block.chart} caption={block.caption} />;
          case "TLDR":
            return (
              <div key={block.id} className="rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-6">
                <p className="text-xs font-bold uppercase tracking-widest text-indigo-400 mb-4">Executive TL;DR</p>
                <ul className="space-y-3">
                  {block.items.filter(Boolean).map((item) => (
                    <li key={item} className="flex gap-3 text-slate-200">
                      <span className="mt-2 h-1.5 w-1.5 rounded-full bg-indigo-400 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            );
          case "COMPARISON_MATRIX":
            return (
              <div key={block.id} className="overflow-x-auto rounded-2xl border border-white/10">
                <table className="w-full text-left text-sm">
                  <thead className="bg-white/5 text-slate-300">
                    <tr>
                      <th className="p-3 font-medium"> </th>
                      {block.columns.map((col) => (
                        <th key={col} className="p-3 font-semibold text-white">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {block.rows.map((row) => (
                      <tr key={row.label} className="border-t border-white/10">
                        <td className="p-3 text-slate-400 font-medium">{row.label}</td>
                        {row.values.map((value, index) => (
                          <td key={`${row.label}-${index}`} className="p-3 text-slate-200">
                            {value}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          case "STAT_BADGES":
            return (
              <div key={block.id} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {block.stats.filter((stat) => stat.value || stat.label).map((stat) => (
                  <div key={`${stat.label}-${stat.value}`} className="rounded-2xl border border-white/10 bg-white/5 p-5">
                    <p className="text-2xl font-black text-white">{stat.value}</p>
                    <p className="text-xs uppercase tracking-widest text-indigo-400 mt-2">{stat.label}</p>
                  </div>
                ))}
              </div>
            );
          case "BEFORE_AFTER":
            return (
              <div key={block.id} className="grid md:grid-cols-2 gap-4">
                <div className="rounded-2xl border border-white/10 p-5">
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">{block.beforeLabel}</p>
                  <p className="text-slate-300 leading-relaxed">{block.beforeText}</p>
                </div>
                <div className="rounded-2xl border border-indigo-500/30 bg-indigo-500/5 p-5">
                  <p className="text-xs font-bold uppercase tracking-widest text-indigo-400 mb-3">{block.afterLabel}</p>
                  <p className="text-slate-200 leading-relaxed">{block.afterText}</p>
                </div>
              </div>
            );
          case "TAM":
            return (
              <div key={block.id} className="rounded-2xl border border-white/10 p-6">
                <p className="text-xs font-bold uppercase tracking-widest text-indigo-400 mb-2">Total addressable market</p>
                <p className="text-2xl font-bold text-white">{block.market}</p>
                <p className="text-slate-300 mt-3 leading-relaxed">{block.insight}</p>
              </div>
            );
          case "MVP_SCOPE":
            return (
              <div key={block.id} className="grid md:grid-cols-2 gap-4">
                <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5">
                  <p className="text-xs font-bold uppercase tracking-widest text-emerald-400 mb-3">4-week MVP</p>
                  <ListItems items={block.now} />
                </div>
                <div className="rounded-2xl border border-white/10 p-5">
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">What can wait</p>
                  <ListItems items={block.later} />
                </div>
              </div>
            );
          case "TECH_STACK":
            return (
              <div key={block.id} className="flex flex-wrap gap-2">
                {block.items.filter(Boolean).map((item) => (
                  <span key={item} className="px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-sm font-medium">
                    {item}
                  </span>
                ))}
              </div>
            );
          case "BUILD_BUDGET":
            return (
              <div key={block.id} className="flex flex-wrap gap-4">
                <div className="rounded-2xl border border-white/10 px-5 py-4">
                  <p className="text-xs uppercase tracking-widest text-slate-500">Build time</p>
                  <p className="text-xl font-bold text-white mt-1">{block.weeks}</p>
                </div>
                <div className="rounded-2xl border border-white/10 px-5 py-4">
                  <p className="text-xs uppercase tracking-widest text-slate-500">Budget</p>
                  <p className="text-xl font-bold text-white mt-1">{block.budget}</p>
                </div>
              </div>
            );
          case "CLIENT_HEADER":
            return (
              <div key={block.id} className="flex items-center gap-4 rounded-2xl border border-white/10 p-5">
                {block.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={block.logoUrl} alt="" className="h-12 w-12 rounded-xl object-contain bg-white/5" />
                ) : null}
                <div>
                  <p className="text-white font-bold text-lg">{block.client}</p>
                  <p className="text-sm text-slate-400">
                    {block.location}
                    {block.scope ? ` · ${block.scope}` : ""}
                  </p>
                </div>
              </div>
            );
          case "DEVICE_GALLERY":
            return (
              <div key={block.id} className="grid sm:grid-cols-2 gap-4">
                {block.images
                  .filter((img) => img.url)
                  .map((img) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={img.url} src={img.url} alt={img.alt || ""} className="rounded-2xl border border-white/10 w-full object-cover" />
                  ))}
              </div>
            );
          case "TESTIMONIAL":
            return (
              <figure key={block.id} className="rounded-2xl border border-white/10 bg-white/5 p-6">
                <blockquote className="text-lg text-slate-200 leading-relaxed">“{block.quote}”</blockquote>
                <figcaption className="mt-4 text-sm text-slate-400">
                  {block.name}
                  {block.role ? `, ${block.role}` : ""}
                  {block.linkedinUrl ? (
                    <>
                      {" · "}
                      <a href={block.linkedinUrl} className="text-indigo-400" target="_blank" rel="noopener noreferrer">
                        LinkedIn
                      </a>
                    </>
                  ) : null}
                </figcaption>
              </figure>
            );
          case "COPY_PROMPT":
            return <CopyPromptButton key={block.id} title={block.title} prompt={block.prompt} />;
          case "PROMPT_VARS":
            return (
              <div key={block.id} className="rounded-2xl border border-white/10 p-5">
                <p className="text-xs font-bold uppercase tracking-widest text-indigo-400 mb-3">Variables</p>
                <ul className="space-y-2 text-sm">
                  {block.variables.map((variable) => (
                    <li key={variable.name} className="text-slate-300">
                      <code className="text-indigo-300">{`{{${variable.name}}}`}</code>
                      {variable.example ? <span className="text-slate-500"> — e.g. {variable.example}</span> : null}
                    </li>
                  ))}
                </ul>
              </div>
            );
          case "USAGE_STEPS":
            return (
              <div key={block.id} className="space-y-3">
                {block.steps.map((step, index) => (
                  <details key={`${step.title}-${index}`} className="rounded-2xl border border-white/10 p-4">
                    <summary className="cursor-pointer font-semibold text-white">
                      {index + 1}. {step.title}
                    </summary>
                    <p className="mt-3 text-slate-300 leading-relaxed">{step.body}</p>
                  </details>
                ))}
              </div>
            );
          case "OUTPUT_PREVIEW":
            return (
              <figure key={block.id} className="rounded-2xl border border-white/10 overflow-hidden">
                {block.kind === "image" && block.content ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={block.content} alt={block.caption || "Output preview"} className="w-full" />
                ) : (
                  <pre className="p-4 text-sm text-slate-200 overflow-x-auto">{block.content}</pre>
                )}
                {block.caption ? <figcaption className="px-4 py-3 text-xs text-slate-500">{block.caption}</figcaption> : null}
              </figure>
            );
          case "CTA": {
            if (block.variant === "newsletter") {
              return (
                <NewsletterCta
                  key={block.id}
                  heading={block.heading}
                  body={block.body}
                  submitLabel={block.label}
                />
              );
            }
            const href = block.href || "/contact";
            const external = href.startsWith("http");
            return (
              <div
                key={block.id}
                className="flex flex-col gap-5 rounded-3xl border border-white/10 bg-white/[0.03] p-6 md:flex-row md:items-center md:justify-between md:p-8"
              >
                <div className="max-w-2xl">
                  <h3 className="text-xl font-bold text-white md:text-2xl">{block.heading}</h3>
                  <p className="mt-2 leading-relaxed text-slate-400">{block.body}</p>
                </div>
                {external ? (
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex shrink-0 items-center justify-center rounded-xl bg-[#FFC300] px-5 py-3 font-black text-[#1C1B1A] transition-all hover:bg-[#FFD60A]"
                  >
                    {block.label}
                  </a>
                ) : (
                  <Link
                    href={href}
                    className="inline-flex shrink-0 items-center justify-center rounded-xl bg-[#FFC300] px-5 py-3 font-black text-[#1C1B1A] transition-all hover:bg-[#FFD60A]"
                  >
                    {block.label}
                  </Link>
                )}
              </div>
            );
          }
          default:
            return null;
        }
      })}
    </div>
  );
}
