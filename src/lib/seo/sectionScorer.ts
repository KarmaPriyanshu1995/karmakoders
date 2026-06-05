import { extractHtmlFromSection, calcReadability } from "@/lib/seo/analyzer";
import { getHealthColor } from "@/components/admin/seo/HealthProgress";

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

function scoreKeywordInHeadings(
  headings: Array<{ level: number; text: string }>,
  keywords: string[]
): number {
  if (keywords.length === 0) return 70;
  const h1h2 = headings.filter((h) => h.level <= 2).map((h) => h.text.toLowerCase());
  if (h1h2.length === 0) return 20;

  const primary = keywords[0]?.toLowerCase();
  const secondary = keywords.slice(1).map((k) => k.toLowerCase());

  const primaryHit = primary && h1h2.some((t) => t.includes(primary));
  if (primaryHit) return 100;

  const secondaryHits = secondary.filter((kw) => h1h2.some((t) => t.includes(kw))).length;
  if (secondaryHits > 0) return 50 + Math.min(40, secondaryHits * 15);

  return 15;
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
  return Math.round((wordCount / targets.min) * 60);
}

function collectImageAltPairs(obj: unknown, pairs: Array<{ hasImage: boolean; alt: string }> = []): Array<{ hasImage: boolean; alt: string }> {
  if (!obj || typeof obj !== "object") return pairs;
  if (Array.isArray(obj)) {
    obj.forEach((item) => collectImageAltPairs(item, pairs));
    return pairs;
  }

  const record = obj as Record<string, unknown>;
  const imageKeys = ["imageUrl", "image", "src", "logoUrl"];
  const hasImageField = imageKeys.some((k) => typeof record[k] === "string" && record[k]);

  if (hasImageField) {
    const alt = typeof record.alt === "string" ? record.alt : typeof record.imageAlt === "string" ? record.imageAlt : "";
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

function scoreReadability(text: string): number {
  if (!text.trim()) return 0;
  const score = calcReadability(text);
  if (score >= 60) return 100;
  if (score >= 40) return 70;
  if (score >= 20) return 45;
  return 25;
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

  const keywordScore = scoreKeywordInHeadings(headings, targetKeywords);
  const wordCountScore = scoreWordCount(sectionType, wordCount);
  const altScore = scoreImageAlt(content);
  const readabilityScore = scoreReadability(text);

  const overall =
    keywordScore * 0.3 +
    wordCountScore * 0.25 +
    altScore * 0.2 +
    readabilityScore * 0.25;

  return Math.round(Math.max(0, Math.min(100, overall)));
}

export function getSectionScoreColor(score: number): string {
  return getHealthColor(score);
}
