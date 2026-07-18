import { extractHtmlFromSection, calcReadability } from "@/lib/seo/analyzer";
import { getHealthColor } from "@/components/admin/seo/HealthProgress";

/** Section SEO weights (total = 100%) */
const WEIGHTS = {
  wordCount: 0.2,
  readability: 0.3,
  headings: 0.1,
  keywordUsage: 0.15,
  internalLinks: 0.1,
  imageAlt: 0.05,
  faq: 0.1,
} as const;

const WORD_COUNT_TARGETS: Record<string, { min: number; ideal: number }> = {
  hero: { min: 30, ideal: 80 },
  pricing: { min: 100, ideal: 250 },
  faq: { min: 150, ideal: 400 },
  about: { min: 100, ideal: 300 },
  content: { min: 200, ideal: 600 },
  services: { min: 80, ideal: 200 },
  contact: { min: 50, ideal: 150 },
  team: { min: 40, ideal: 120 },
  testimonials: { min: 60, ideal: 180 },
  projects: { min: 40, ideal: 120 },
  casestudies: { min: 80, ideal: 250 },
  careers: { min: 60, ideal: 180 },
  default: { min: 50, ideal: 200 },
};

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function extractHeadingsFromHtml(html: string): Array<{ level: number; text: string }> {
  const headings: Array<{ level: number; text: string }> = [];
  const regex = /<h([1-6])[^>]*>(.*?)<\/h[1-6]>/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    headings.push({ level: parseInt(match[1], 10), text: stripHtml(match[2]) });
  }
  return headings;
}

function scoreWordCount(sectionType: string, wordCount: number): number {
  const targets = WORD_COUNT_TARGETS[sectionType.toLowerCase()] ?? WORD_COUNT_TARGETS.default;
  if (wordCount >= targets.ideal) return 100;
  if (wordCount >= targets.min) {
    const range = targets.ideal - targets.min;
    const progress = (wordCount - targets.min) / (range || 1);
    return Math.round(60 + progress * 40);
  }
  if (wordCount === 0) return 0;
  // Soft scaling — short content is penalized but not zeroed out
  return Math.round((wordCount / targets.min) * 60);
}

function scoreHeadings(
  headings: Array<{ level: number; text: string }>,
  content: Record<string, unknown>
): number {
  const hasH1 = headings.some((h) => h.level === 1) || Boolean(content.h1);
  const hasH2 = headings.some((h) => h.level === 2) || Boolean(content.heading);
  const hasH3 = headings.some((h) => h.level === 3) || Boolean(content.subheading);
  const headingCount = headings.length + (content.h1 ? 1 : 0) + (content.heading ? 1 : 0);

  let score = 0;
  if (hasH1) score += 40;
  if (hasH2) score += 35;
  if (hasH3) score += 15;
  if (!hasH1 && !hasH2 && headingCount >= 2) score += 50;
  else if (!hasH1 && headingCount >= 1) score += 30;

  return Math.min(100, score || 20);
}

function scoreKeywordUsage(
  text: string,
  headings: Array<{ level: number; text: string }>,
  content: Record<string, unknown>,
  targetKeywords: string[]
): number {
  const focusKeyword =
    typeof content.focusKeyword === "string" && content.focusKeyword.trim()
      ? content.focusKeyword.trim().toLowerCase()
      : targetKeywords[0]?.toLowerCase();

  if (!focusKeyword) return 70;

  const lowerText = text.toLowerCase();
  const headingText = headings.map((h) => h.text.toLowerCase()).join(" ");

  const inBody = lowerText.includes(focusKeyword);
  const inHeading = headingText.includes(focusKeyword);

  if (inHeading && inBody) return 100;
  if (inHeading) return 85;
  if (inBody) return 75;

  return 25;
}

function scoreInternalLinks(html: string, content: Record<string, unknown>): number {
  const anchorMatches = html.match(/<a[^>]+href=["'][^"']+["'][^>]*>/gi) || [];
  const hasCta =
    typeof content.ctaUrl === "string" &&
    content.ctaUrl.trim() &&
    typeof content.ctaText === "string" &&
    content.ctaText.trim();
  const hasInternal =
    typeof content.internalLinkUrl === "string" &&
    content.internalLinkUrl.trim() &&
    typeof content.internalLinkText === "string" &&
    content.internalLinkText.trim();

  const linkCount = anchorMatches.length + (hasCta ? 1 : 0) + (hasInternal ? 1 : 0);

  if (linkCount >= 2) return 100;
  if (linkCount === 1) return 75;
  return 40;
}

function collectImageAltPairs(
  obj: unknown,
  pairs: Array<{ hasImage: boolean; alt: string }> = []
): Array<{ hasImage: boolean; alt: string }> {
  if (!obj || typeof obj !== "object") return pairs;
  if (Array.isArray(obj)) {
    obj.forEach((item) => collectImageAltPairs(item, pairs));
    return pairs;
  }

  const record = obj as Record<string, unknown>;
  const imageKeys = ["imageUrl", "image", "src", "logoUrl"];
  const hasImageField = imageKeys.some((k) => typeof record[k] === "string" && record[k]);

  if (hasImageField) {
    const alt =
      typeof record.alt === "string"
        ? record.alt
        : typeof record.imageAlt === "string"
          ? record.imageAlt
          : "";
    pairs.push({ hasImage: true, alt });
  }

  Object.values(record).forEach((v) => {
    if (typeof v === "object") collectImageAltPairs(v, pairs);
  });

  return pairs;
}

function scoreImageAlt(content: Record<string, unknown>): number {
  const pairs = collectImageAltPairs(content);
  if (pairs.length === 0) return 100;
  const withAlt = pairs.filter((p) => p.alt.trim().length > 0).length;
  return Math.round((withAlt / pairs.length) * 100);
}

function scoreFaq(content: Record<string, unknown>, text: string): number {
  const faqs = content.faqs;
  if (Array.isArray(faqs) && faqs.length >= 2) return 100;
  if (Array.isArray(faqs) && faqs.length === 1) return 80;
  if (/\bfaq\b|frequently asked/i.test(text)) return 75;
  return 60;
}

export function calculateSectionSeoScore(
  sectionType: string,
  content: Record<string, unknown>,
  targetKeywords: string[]
): number {
  const html = extractHtmlFromSection(content);
  const text = stripHtml(html);
  const headings = extractHeadingsFromHtml(html);
  const wordCount = (text.match(/\b\w+\b/g) || []).length;

  const wordCountScore = scoreWordCount(sectionType, wordCount);
  const readabilityScore = calcReadability(text, html);
  const headingsScore = scoreHeadings(headings, content);
  const keywordScore = scoreKeywordUsage(text, headings, content, targetKeywords);
  const internalLinksScore = scoreInternalLinks(html, content);
  const altScore = scoreImageAlt(content);
  const faqScore = scoreFaq(content, text);

  const overall =
    wordCountScore * WEIGHTS.wordCount +
    readabilityScore * WEIGHTS.readability +
    headingsScore * WEIGHTS.headings +
    keywordScore * WEIGHTS.keywordUsage +
    internalLinksScore * WEIGHTS.internalLinks +
    altScore * WEIGHTS.imageAlt +
    faqScore * WEIGHTS.faq;

  return Math.round(Math.max(0, Math.min(100, overall)));
}

export function getSectionScoreColor(score: number): string {
  return getHealthColor(score);
}
