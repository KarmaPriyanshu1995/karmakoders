// Rule-based AI SEO Recommender — generates heuristic recommendations

export interface PageContext {
  url: string;
  title?: string | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
  h1?: string | null;
  wordCount?: number;
  primaryKeyword?: string;
  pageType?: string;
  topKeywords?: string[];
  hasFaq?: boolean;
  hasSchema?: boolean;
  internalLinksCount?: number;
  readabilityScore?: number;
  issues?: Array<{ type: string; severity: string }>;
}

export interface Recommendation {
  type: string;
  title: string;
  content: string;
  priority: "critical" | "important" | "recommended";
}

// Generate an optimized meta title
export function generateMetaTitle(ctx: PageContext): string {
  const keyword = ctx.primaryKeyword || extractKeyword(ctx.title || "");
  const brand = "Karmakoders";

  if (!keyword) return `${ctx.title || "Page"} | ${brand}`;

  const titleVariants = [
    `${capitalize(keyword)} Services | ${brand}`,
    `Expert ${capitalize(keyword)} | ${brand}`,
    `${capitalize(keyword)} Solutions — ${brand}`,
    `Best ${capitalize(keyword)} Company | ${brand}`,
    `${capitalize(keyword)} Agency | ${brand}`,
  ];

  // Pick shortest that's still 50+ chars
  const selected = titleVariants.find((t) => t.length >= 50 && t.length <= 60);
  return selected || titleVariants[0];
}

// Generate an optimized meta description
export function generateMetaDescription(ctx: PageContext): string {
  const keyword = ctx.primaryKeyword || extractKeyword(ctx.title || "");
  const url = ctx.url;

  if (!keyword) {
    return `Explore ${ctx.title || "our services"} at Karmakoders. We deliver high-quality digital solutions that help your business grow online. Get in touch today.`;
  }

  const templates = [
    `Looking for expert ${keyword}? Karmakoders delivers ${keyword} solutions that drive results. Trusted by businesses worldwide. Contact us today!`,
    `Karmakoders offers professional ${keyword} services. Our team specializes in delivering ${keyword} that grows your business. Get a free consultation.`,
    `Get top-tier ${keyword} from Karmakoders. We combine creativity and technology to build ${keyword} solutions that rank and convert. Contact us now.`,
  ];

  const selected = templates.find((t) => t.length >= 140 && t.length <= 160);
  return selected || templates[0];
}

// Generate FAQ questions
export function generateFaqQuestions(ctx: PageContext): Array<{ question: string; answer: string }> {
  const keyword = ctx.primaryKeyword || extractKeyword(ctx.title || "") || "our services";

  return [
    {
      question: `What is ${keyword}?`,
      answer: `${capitalize(keyword)} refers to ${keyword} solutions that help businesses achieve their digital goals. At Karmakoders, we specialize in delivering high-quality ${keyword} tailored to your specific needs.`,
    },
    {
      question: `How much does ${keyword} cost?`,
      answer: `The cost of ${keyword} varies based on project scope and requirements. Contact Karmakoders for a free consultation and customized quote.`,
    },
    {
      question: `Why choose Karmakoders for ${keyword}?`,
      answer: `Karmakoders has expertise in ${keyword} with a proven track record of successful projects. We combine technical excellence with creative problem-solving to deliver exceptional results.`,
    },
    {
      question: `How long does ${keyword} take?`,
      answer: `Timeline for ${keyword} projects varies based on complexity. A typical project takes 2–8 weeks. We provide a detailed timeline during our initial consultation.`,
    },
    {
      question: `Do you offer ${keyword} for small businesses?`,
      answer: `Yes! Karmakoders offers ${keyword} solutions for businesses of all sizes, from startups to enterprise. We tailor our approach to your budget and goals.`,
    },
  ];
}

// Generate content improvement suggestions
export function generateContentImprovements(ctx: PageContext): string[] {
  const suggestions: string[] = [];
  const keyword = ctx.primaryKeyword || extractKeyword(ctx.title || "");

  if ((ctx.wordCount || 0) < 600) {
    suggestions.push(`Expand content to at least 800 words. Currently ${ctx.wordCount || 0} words — thin content ranks poorly.`);
  }
  if (!ctx.hasFaq) {
    suggestions.push(`Add an FAQ section with 5–8 questions about "${keyword || "your topic"}" to capture long-tail search intent.`);
  }
  if ((ctx.internalLinksCount || 0) < 3) {
    suggestions.push("Add 3–5 internal links to related pages on your site to distribute link equity.");
  }
  if ((ctx.readabilityScore || 0) < 50) {
    suggestions.push("Improve readability: use shorter sentences, bullet points, and simpler language (target Grade 8 reading level).");
  }
  if (!ctx.hasSchema) {
    suggestions.push(`Add structured data schema (JSON-LD) to help Google understand your content and enable rich results.`);
  }
  if (keyword) {
    suggestions.push(`Include "${keyword}" in your H2 and H3 subheadings to reinforce topical relevance.`);
    suggestions.push(`Use variations of "${keyword}" naturally throughout the content to avoid keyword stuffing while maintaining relevance.`);
  }
  suggestions.push("Add author bio and date to signal E-E-A-T (Experience, Expertise, Authoritativeness, Trustworthiness).");
  suggestions.push("Include statistics, data, or case studies to add credibility and increase dwell time.");

  return suggestions;
}

// Generate E-E-A-T improvements
export function generateEEATImprovements(ctx: PageContext): string[] {
  return [
    "Add a clear author byline with professional bio and credentials.",
    "Include a publication and last-updated date on all content.",
    "Add references and citations to authoritative external sources.",
    "Display client testimonials, case studies, or reviews on service pages.",
    "Add team/founder page with detailed professional background.",
    "Link to your social media profiles and industry associations.",
    "Display awards, certifications, or press mentions.",
    "Add a detailed About page explaining your company's expertise and mission.",
  ];
}

// Generate internal link suggestions
export function generateInternalLinkSuggestions(
  currentPageTitle: string,
  allPages: Array<{ title: string; url: string; slug: string }>
): Array<{ url: string; anchorText: string; reason: string }> {
  const currentWords = (currentPageTitle || "").toLowerCase().split(/\s+/);
  const suggestions: Array<{ url: string; anchorText: string; reason: string }> = [];

  for (const page of allPages) {
    if (page.title.toLowerCase() === currentPageTitle.toLowerCase()) continue;
    const pageWords = page.title.toLowerCase().split(/\s+/);
    const overlap = currentWords.filter((w) => pageWords.includes(w) && w.length > 3).length;
    if (overlap > 0) {
      suggestions.push({
        url: page.url,
        anchorText: page.title,
        reason: `Topically related — shares keywords: ${currentWords.filter((w) => pageWords.includes(w) && w.length > 3).join(", ")}`,
      });
    }
  }

  return suggestions.slice(0, 8);
}

// Generate all recommendations for a page
export function generateAllRecommendations(ctx: PageContext): Recommendation[] {
  const recs: Recommendation[] = [];
  const issues = ctx.issues || [];

  const hasCritical = (type: string) => issues.some((i) => i.type === type);

  if (hasCritical("missing_meta_title") || !ctx.metaTitle) {
    recs.push({
      type: "meta_title",
      title: "Generate Optimized Meta Title",
      content: generateMetaTitle(ctx),
      priority: "critical",
    });
  }

  if (hasCritical("missing_meta_desc") || !ctx.metaDescription) {
    recs.push({
      type: "meta_description",
      title: "Generate Meta Description",
      content: generateMetaDescription(ctx),
      priority: "critical",
    });
  }

  if (!ctx.hasFaq) {
    const faqs = generateFaqQuestions(ctx);
    recs.push({
      type: "faq",
      title: "Add FAQ Section",
      content: faqs.map((f) => `Q: ${f.question}\nA: ${f.answer}`).join("\n\n"),
      priority: "important",
    });
  }

  const improvements = generateContentImprovements(ctx);
  if (improvements.length > 0) {
    recs.push({
      type: "content",
      title: "Content Improvement Plan",
      content: improvements.map((i, n) => `${n + 1}. ${i}`).join("\n"),
      priority: "important",
    });
  }

  if (!ctx.hasSchema) {
    recs.push({
      type: "schema",
      title: "Add Structured Data",
      content: "Add FAQ Schema, Organization Schema, and Service Schema to enable rich results in Google Search.",
      priority: "important",
    });
  }

  const eeat = generateEEATImprovements(ctx);
  recs.push({
    type: "eeat",
    title: "Improve E-E-A-T Signals",
    content: eeat.map((e, n) => `${n + 1}. ${e}`).join("\n"),
    priority: "recommended",
  });

  return recs;
}

// --- Helpers ---
export function generateImageAlt(src: string, contextTitle: string): string {
  if (!src) return `${contextTitle} image`;
  const filename = src.split('/').pop()?.split('?')[0] || '';
  const nameWithoutExt = filename.replace(/\.[^/.]+$/, "").replace(/[-_]/g, ' ');
  const cleanName = nameWithoutExt.trim();
  if (cleanName && cleanName.length > 2 && isNaN(Number(cleanName))) {
    return `${capitalize(cleanName)} - ${contextTitle}`;
  }
  return `${contextTitle} image`;
}

function extractKeyword(title: string): string {
  const stopWords = new Set(["and", "the", "for", "our", "your", "with", "from", "that", "this", "are", "has", "was", "not", "all"]);
  const words = title.toLowerCase().split(/\s+/).filter((w) => w.length > 3 && !stopWords.has(w));
  return words.slice(0, 2).join(" ");
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

