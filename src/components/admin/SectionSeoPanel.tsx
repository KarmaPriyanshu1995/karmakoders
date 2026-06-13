"use client";

import { useMemo } from "react";
import { CheckCircle2, AlertCircle, Info } from "lucide-react";
import { extractHtmlFromSection, calcReadability, getReadabilityRating } from "@/lib/seo/analyzer";

interface SectionSeoPanelProps {
  content: Record<string, unknown>;
  targetKeywords: string[];
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

export function SectionSeoPanel({ content, targetKeywords }: SectionSeoPanelProps) {
  const stats = useMemo(() => {
    const html = extractHtmlFromSection(content);
    const text = stripHtml(html);
    const wordCount = (text.match(/\b\w+\b/g) || []).length;
    const hasH1 = /<h1[^>]*>/i.test(html) || Boolean(content.h1);
    const hasImage = Boolean(content.imageUrl || content.image);
    const hasAlt = Boolean(
      (typeof content.imageAlt === "string" && content.imageAlt.trim()) ||
      (typeof content.alt === "string" && content.alt.trim())
    );
    const readability = text ? calcReadability(text, html) : 0;
    const focusKeyword =
      typeof content.focusKeyword === "string" ? content.focusKeyword.trim().toLowerCase() : "";
    const keywordInContent =
      focusKeyword.length > 0
        ? text.toLowerCase().includes(focusKeyword)
        : targetKeywords[0]
          ? text.toLowerCase().includes(targetKeywords[0].toLowerCase())
          : null;

    return { wordCount, hasH1, hasImage, hasAlt, readability, keywordInContent, focusKeyword };
  }, [content, targetKeywords]);

  const checks = [
    {
      ok: stats.wordCount >= 100,
      warn: stats.wordCount >= 50,
      label: `Word count: ${stats.wordCount} (aim for 300+)`,
    },
    {
      ok: stats.hasH1,
      label: stats.hasH1 ? "H1 heading set" : "Add H1 Heading field (one per page)",
    },
    {
      ok: !stats.hasImage || stats.hasAlt,
      label: stats.hasImage
        ? stats.hasAlt
          ? "Image alt text set"
          : "Add Image Alt Text for your image"
        : "Optional: add an image with alt text",
    },
    {
      ok: stats.readability >= 60,
      warn: stats.readability >= 50,
      label: `Readability: ${stats.readability}/100 (${getReadabilityRating(stats.readability)})`,
    },
    {
      ok: stats.keywordInContent === true,
      warn: stats.keywordInContent === null,
      label:
        stats.keywordInContent === null
          ? "Add a Focus Keyword to track usage"
          : stats.keywordInContent
            ? "Focus keyword found in content"
            : "Include your focus keyword in the body text",
    },
  ];

  return (
    <div className="rounded-lg border border-[#FFC300]/20 bg-[#FFC300]/5 p-3 space-y-2">
      <p className="text-[10px] font-black text-[#FFC300] uppercase tracking-wider">SEO Checklist</p>
      <ul className="space-y-1.5">
        {checks.map((check) => {
          const Icon = check.ok ? CheckCircle2 : check.warn ? Info : AlertCircle;
          const color = check.ok ? "text-green-400" : check.warn ? "text-yellow-400" : "text-red-400";
          return (
            <li key={check.label} className={`flex items-start gap-2 text-xs ${color}`}>
              <Icon className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span>{check.label}</span>
            </li>
          );
        })}
      </ul>
      <p className="text-[10px] text-slate-500 leading-relaxed pt-1">
        Tip: Use H1 once per page, add 300+ words, upload an image with alt text, and link to other pages internally.
      </p>
    </div>
  );
}
