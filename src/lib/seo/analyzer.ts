// SEO Content Analyzer — Rule-based heuristic analysis

import { calcReadability } from "@/lib/seo/readability";

export { calcReadability, getReadabilityRating, stripHtmlForReadability } from "@/lib/seo/readability";

export interface HeadingNode {
  level: number;
  text: string;
}

export interface PageAnalysisInput {
  title?: string | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
  content?: string | null;
  slug?: string | null;
  imageUrl?: string | null;
}

export interface PageAnalysisResult {
  metaTitle: string | null;
  metaDescription: string | null;
  h1: string | null;
  headings: HeadingNode[];
  wordCount: number;
  readabilityScore: number;
  imagesCount: number;
  imagesWithAlt: number;
  hasFaq: boolean;
  keywordDensity: Record<string, number>;
  issues: Array<{ type: string; severity: "critical" | "important" | "recommended"; description: string; suggestion: string }>;
  recommendations: string[];
}

// Strip HTML tags from content
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

// Extract headings from HTML content
function extractHeadings(html: string): HeadingNode[] {
  const headings: HeadingNode[] = [];
  const regex = /<h([1-6])[^>]*>(.*?)<\/h[1-6]>/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    headings.push({ level: parseInt(match[1]), text: stripHtml(match[2]) });
  }
  return headings;
}

// Extract images and check alt text
function extractImages(html: string): { total: number; withAlt: number } {
  const imgRegex = /<img[^>]*>/gi;
  const altRegex = /alt=["'][^"']+["']/i;
  const imgs = html.match(imgRegex) || [];
  const withAlt = imgs.filter((img) => altRegex.test(img)).length;
  return { total: imgs.length, withAlt };
}

// Check if content has FAQ patterns
function hasFaqContent(text: string): boolean {
  const faqPatterns = [/frequently asked/i, /\bfaq\b/i, /\bq:/i, /\bquestion:/i, /\bwhat is\b/i, /\bhow (to|do|can|does)\b/i];
  return faqPatterns.some((p) => p.test(text));
}

// Calculate keyword density (top 10 words, 3+ chars)
function calcKeywordDensity(text: string): Record<string, number> {
  const words = text.toLowerCase().match(/\b[a-z]{3,}\b/g) || [];
  const stopWords = new Set(["the", "and", "for", "are", "but", "not", "you", "all", "can", "has", "her", "was", "one", "our", "out", "day", "get", "has", "him", "his", "how", "man", "new", "now", "old", "see", "two", "way", "who", "boy", "did", "its", "let", "put", "say", "she", "too", "use", "that", "this", "with", "they", "from", "your", "more", "will", "been", "have", "into", "than", "then", "them", "some", "also", "what", "when", "which"]);
  const freq: Record<string, number> = {};
  words.forEach((w) => { if (!stopWords.has(w)) freq[w] = (freq[w] || 0) + 1; });
  const total = words.length || 1;
  const density: Record<string, number> = {};
  Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .forEach(([w, c]) => { density[w] = parseFloat(((c / total) * 100).toFixed(2)); });
  return density;
}

function escapeHtmlAttr(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

function appendTextBlock(html: string, strVal: string): string {
  if (/<[a-z][\s\S]*>/i.test(strVal)) return html + strVal + "\n";
  return html + `<p>${strVal}</p>\n`;
}

// Recursively extracts HTML from a page section's content object
export function extractHtmlFromSection(content: any): string {
  if (!content) return "";
  if (typeof content === "string") {
    if (/<[a-z][\s\S]*>/i.test(content)) {
      return content;
    }
    return `<p>${content}</p>`;
  }
  if (Array.isArray(content)) {
    return content.map((item) => extractHtmlFromSection(item)).join("\n");
  }
  if (typeof content === "object") {
    let html = "";
    const record = content as Record<string, unknown>;
    const imageAlt =
      typeof record.imageAlt === "string"
        ? record.imageAlt
        : typeof record.alt === "string"
          ? record.alt
          : "";
    const imageTitle = typeof record.imageTitle === "string" ? record.imageTitle : "";

    for (const [key, value] of Object.entries(record)) {
      if (value === null || value === undefined) continue;

      if (key === "faqs" && Array.isArray(value)) {
        for (const item of value) {
          if (item && typeof item === "object") {
            const faq = item as Record<string, unknown>;
            if (faq.question) html += `<h3>${String(faq.question)}</h3>\n`;
            if (faq.answer) html = appendTextBlock(html, String(faq.answer));
          }
        }
        continue;
      }

      if (typeof value === "object") {
        html += extractHtmlFromSection(value) + "\n";
        continue;
      }

      const strVal = String(value);
      if (!strVal.trim()) continue;

      if (key === "h1" || key === "headline") {
        html += `<h1>${strVal}</h1>\n`;
      } else if (key === "heading" || key === "title") {
        html += `<h2>${strVal}</h2>\n`;
      } else if (key === "subheading" || key === "subtitle") {
        html += `<h3>${strVal}</h3>\n`;
      } else if (key === "tagline") {
        html += `<p><strong>${strVal}</strong></p>\n`;
      } else if (key === "body" || key === "secondaryBody" || key === "description" || key === "content" || key === "text") {
        html = appendTextBlock(html, strVal);
      } else if (key === "ctaText" && typeof record.ctaUrl === "string" && record.ctaUrl) {
        html += `<a href="${escapeHtmlAttr(record.ctaUrl)}">${strVal}</a>\n`;
      } else if (key === "internalLinkText" && typeof record.internalLinkUrl === "string" && record.internalLinkUrl) {
        html += `<a href="${escapeHtmlAttr(record.internalLinkUrl)}">${strVal}</a>\n`;
      } else if (key === "imageUrl" || key === "image" || key === "src" || key === "logoUrl") {
        const titleAttr = imageTitle ? ` title="${escapeHtmlAttr(imageTitle)}"` : "";
        html += `<img src="${escapeHtmlAttr(strVal)}" alt="${escapeHtmlAttr(imageAlt)}"${titleAttr} />\n`;
      } else if (
        key !== "ctaUrl" &&
        key !== "internalLinkUrl" &&
        key !== "imageAlt" &&
        key !== "imageTitle" &&
        key !== "focusKeyword" &&
        (key === "link" || key === "href" || key === "url")
      ) {
        if (strVal.startsWith("/") || strVal.includes("karmakoders") || strVal.startsWith("http")) {
          html += `<a href="${escapeHtmlAttr(strVal)}">${strVal}</a>\n`;
        }
      } else if (typeof value === "string" && value.length > 20) {
        html = appendTextBlock(html, strVal);
      }
    }
    return html;
  }
  return "";
}

export function extractPageHtmlFromSections(
  sections: Array<{ content: string | Record<string, unknown> }>
): string {
  return sections
    .map((section) => {
      try {
        const parsed =
          typeof section.content === "string" ? JSON.parse(section.content) : section.content;
        return extractHtmlFromSection(parsed);
      } catch {
        return "";
      }
    })
    .join("\n");
}

export function analyzePage(input: PageAnalysisInput): PageAnalysisResult {
  const html = input.content || "";
  const text = stripHtml(html);
  const headings = extractHeadings(html);
  const h1Node = headings.find((h) => h.level === 1);
  const { total: imagesCount, withAlt: imagesWithAlt } = extractImages(html);
  const wordCount = (text.match(/\b\w+\b/g) || []).length;
  const hasFaq = hasFaqContent(text);
  const keywordDensity = calcKeywordDensity(text);
  const readabilityScore = calcReadability(text, html);

  const issues: PageAnalysisResult["issues"] = [];
  const recommendations: string[] = [];

  const metaTitle = input.metaTitle || input.title || null;
  const metaDescription = input.metaDescription || null;

  // Meta title checks
  if (!metaTitle) {
    issues.push({ type: "missing_meta_title", severity: "critical", description: "Page is missing a meta title.", suggestion: "Add a descriptive meta title (50–60 characters)." });
  } else if (metaTitle.length < 30) {
    issues.push({ type: "short_meta_title", severity: "important", description: `Meta title is too short (${metaTitle.length} chars).`, suggestion: "Expand meta title to 50–60 characters for better visibility." });
  } else if (metaTitle.length > 65) {
    issues.push({ type: "long_meta_title", severity: "important", description: `Meta title is too long (${metaTitle.length} chars).`, suggestion: "Shorten meta title to under 60 characters to prevent truncation." });
  }

  // Meta description checks
  if (!metaDescription) {
    issues.push({ type: "missing_meta_desc", severity: "critical", description: "Page is missing a meta description.", suggestion: "Add a compelling meta description (150–160 characters)." });
  } else if (metaDescription.length < 100) {
    issues.push({ type: "short_meta_desc", severity: "important", description: `Meta description is too short (${metaDescription.length} chars).`, suggestion: "Expand meta description to 150–160 characters." });
  } else if (metaDescription.length > 165) {
    issues.push({ type: "long_meta_desc", severity: "important", description: `Meta description is too long (${metaDescription.length} chars).`, suggestion: "Shorten meta description to under 160 characters." });
  }

  // H1 checks
  if (!h1Node) {
    issues.push({ type: "missing_h1", severity: "critical", description: "Page has no H1 heading.", suggestion: "Add a single, keyword-rich H1 heading." });
  } else if (headings.filter((h) => h.level === 1).length > 1) {
    issues.push({ type: "multiple_h1", severity: "important", description: "Page has multiple H1 headings.", suggestion: "Use only one H1 per page." });
  }

  // Heading sequence hierarchy checks (e.g. H2 followed directly by H4)
  let prevLevel = 1;
  let headingSequenceIssue = false;
  for (const h of headings) {
    if (h.level > prevLevel + 1) {
      headingSequenceIssue = true;
      break;
    }
    prevLevel = h.level;
  }
  if (headingSequenceIssue) {
    issues.push({
      type: "heading_hierarchy_skipped",
      severity: "recommended",
      description: "Page heading levels are skipped (e.g. H2 followed directly by H4).",
      suggestion: "Ensure heading tags follow a logical nested order (H1 -> H2 -> H3)."
    });
  }

  // Word count
  if (wordCount < 300) {
    issues.push({ type: "thin_content", severity: "critical", description: `Content is very thin (${wordCount} words).`, suggestion: "Expand content to at least 600–800 words for better ranking." });
  } else if (wordCount < 600) {
    issues.push({ type: "low_word_count", severity: "important", description: `Content has low word count (${wordCount} words).`, suggestion: "Consider expanding content to 800+ words for comprehensive coverage." });
  }

  // Image ALT text & compression formats
  const imgs = html.match(/<img[^>]*>/gi) || [];
  let unoptimizedImages = 0;
  let missingDimensions = 0;
  for (const img of imgs) {
    const srcMatch = img.match(/src=["']([^"']+)["']/i);
    if (srcMatch) {
      const src = srcMatch[1].toLowerCase();
      if (src.endsWith(".png") || src.endsWith(".jpg") || src.endsWith(".jpeg") || src.endsWith(".gif")) {
        unoptimizedImages++;
      }
    }
    const hasWidth = /width=["'][^"']+["']/i.test(img);
    const hasHeight = /height=["'][^"']+["']/i.test(img);
    if (!hasWidth || !hasHeight) {
      missingDimensions++;
    }
  }

  if (imagesCount > 0 && imagesWithAlt < imagesCount) {
    const missing = imagesCount - imagesWithAlt;
    issues.push({ type: "missing_alt_text", severity: "important", description: `${missing} image(s) are missing ALT text.`, suggestion: "Add descriptive ALT text to all images." });
  }
  if (unoptimizedImages > 0) {
    issues.push({
      type: "unoptimized_image_format",
      severity: "important",
      description: `${unoptimizedImages} image(s) use unoptimized formats (PNG/JPG).`,
      suggestion: "Convert images to modern formats like WebP or AVIF to reduce file size."
    });
  }
  if (missingDimensions > 0) {
    issues.push({
      type: "missing_image_dimensions",
      severity: "recommended",
      description: `${missingDimensions} image(s) are missing explicit width and height attributes.`,
      suggestion: "Add width and height attributes to images to prevent layout shifts (CLS)."
    });
  }

  // FAQ check
  if (!hasFaq && wordCount > 500) {
    issues.push({ type: "missing_faq", severity: "recommended", description: "Page doesn't appear to have FAQ content.", suggestion: "Add an FAQ section to target long-tail question keywords." });
    recommendations.push("Add FAQ section targeting common user questions about this topic.");
  }

  // Readability
  if (readabilityScore < 50) {
    issues.push({
      type: "low_readability",
      severity: "recommended",
      description: `Readability score is low (${readabilityScore}/100).`,
      suggestion: "Use shorter sentences (under 20 words), break content into paragraphs, and use simpler words.",
    });
  }

  // Heading structure
  if (headings.length < 3 && wordCount > 400) {
    issues.push({ type: "poor_heading_structure", severity: "recommended", description: "Content lacks sufficient heading structure.", suggestion: "Add H2 and H3 subheadings to organize content and aid scannability." });
  }

  return {
    metaTitle,
    metaDescription,
    h1: h1Node?.text || null,
    headings,
    wordCount,
    readabilityScore,
    imagesCount,
    imagesWithAlt,
    hasFaq,
    keywordDensity,
    issues,
    recommendations,
  };
}
