export interface ToolPageContent {
  heroHeading: string;
  heroSubheading: string;
  h2: string;
  introAbove: string;
  introBelow: string;
  sections: { heading: string; body: string }[];
  faq: { question: string; answer: string }[];
}

const EMPTY: ToolPageContent = {
  heroHeading: "",
  heroSubheading: "",
  h2: "",
  introAbove: "",
  introBelow: "",
  sections: [],
  faq: [],
};

export function parseToolContent(raw: string | null | undefined): ToolPageContent {
  if (!raw) return { ...EMPTY, sections: [], faq: [] };
  try {
    const parsed = JSON.parse(raw) as Partial<ToolPageContent>;
    const sections = Array.isArray(parsed.sections)
      ? parsed.sections
          .filter((item) => item && typeof item.heading === "string")
          .map((item) => ({ heading: item.heading, body: typeof item.body === "string" ? item.body : "" }))
      : [];
    const faq = Array.isArray(parsed.faq)
      ? parsed.faq
          .filter((item) => item && typeof item.question === "string" && typeof item.answer === "string")
          .map((item) => ({ question: item.question.trim(), answer: item.answer.trim() }))
          .filter((item) => item.question && item.answer)
      : [];
    return {
      heroHeading: typeof parsed.heroHeading === "string" ? parsed.heroHeading : "",
      heroSubheading: typeof parsed.heroSubheading === "string" ? parsed.heroSubheading : "",
      h2: typeof parsed.h2 === "string" ? parsed.h2 : "",
      introAbove: typeof parsed.introAbove === "string" ? parsed.introAbove : "",
      introBelow: typeof parsed.introBelow === "string" ? parsed.introBelow : "",
      sections,
      faq,
    };
  } catch {
    return { ...EMPTY, sections: [], faq: [] };
  }
}

export function toolSeoScore(input: {
  seoTitle?: string | null;
  seoDescription?: string | null;
  seoKeywords?: string | null;
  canonicalUrl?: string | null;
  ogImage?: string | null;
  schemaType?: string | null;
  contentJson?: string | null;
}): { score: number; missing: string[] } {
  const content = parseToolContent(input.contentJson);
  const checks: { ok: boolean; label: string }[] = [
    { ok: (input.seoTitle || "").trim().length >= 30 && (input.seoTitle || "").trim().length <= 60, label: "Title tag (30–60 characters)" },
    { ok: (input.seoDescription || "").trim().length >= 70 && (input.seoDescription || "").trim().length <= 160, label: "Meta description (70–160 characters)" },
    { ok: Boolean((input.seoKeywords || "").trim()), label: "Target keywords" },
    { ok: Boolean((input.canonicalUrl || "").trim()), label: "Canonical URL" },
    { ok: Boolean((input.ogImage || "").trim()), label: "Social share image" },
    { ok: Boolean(content.heroHeading.trim()), label: "H1" },
    { ok: Boolean(content.h2.trim() || content.sections.length), label: "H2" },
    { ok: Boolean(content.introAbove.trim() || content.introBelow.trim() || content.heroSubheading.trim()), label: "Introductory copy" },
    { ok: content.faq.length > 0, label: "FAQ schema entries" },
    { ok: input.schemaType === "WebApplication" || input.schemaType === "SoftwareApplication", label: "Application schema type" },
  ];
  const missing = checks.filter((item) => !item.ok).map((item) => item.label);
  const score = Math.round(((checks.length - missing.length) / checks.length) * 100);
  return { score, missing };
}
