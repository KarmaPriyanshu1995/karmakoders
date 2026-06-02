// Technical SEO Audit Engine

export interface AuditPage {
  id: string;
  type: "page" | "post" | "project";
  title?: string | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
  slug: string;
  content?: string | null;
  published?: boolean;
  isIndexed?: boolean;
}

export interface AuditIssue {
  pageId: string;
  pageType: string;
  url: string;
  type: string;
  severity: "critical" | "important" | "recommended";
  description: string;
  suggestion: string;
}

export interface AuditResult {
  totalPages: number;
  indexedPages: number;
  nonIndexedPages: number;
  missingTitles: number;
  duplicateTitles: number;
  missingDescriptions: number;
  duplicateDescriptions: number;
  missingH1: number;
  multipleH1: number;
  missingAlt: number;
  orphanPages: number;
  issues: AuditIssue[];
  technicalScore: number;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function countH1(html: string): number {
  return (html.match(/<h1[^>]*>/gi) || []).length;
}

function countMissingAlt(html: string): number {
  const imgs = html.match(/<img[^>]*>/gi) || [];
  return imgs.filter((img) => !/alt=["'][^"']+["']/i.test(img)).length;
}

function buildUrl(page: AuditPage): string {
  if (page.type === "post") return `/blog/${page.slug}`;
  if (page.type === "project") return `/projects/${page.slug}`;
  return `/${page.slug === "home" ? "" : page.slug}`;
}

export function runAudit(pages: AuditPage[]): AuditResult {
  const issues: AuditIssue[] = [];
  const titlesMap = new Map<string, number>();
  const descsMap = new Map<string, number>();

  let missingTitles = 0;
  let missingDescriptions = 0;
  let missingH1 = 0;
  let multipleH1 = 0;
  let missingAlt = 0;
  let nonIndexed = 0;

  for (const page of pages) {
    const url = buildUrl(page);
    const html = page.content || "";
    const isIndexed = page.isIndexed !== false;
    if (!isIndexed) nonIndexed++;

    // Meta title
    const metaTitle = page.metaTitle || page.title || "";
    if (!metaTitle) {
      missingTitles++;
      issues.push({ pageId: page.id, pageType: page.type, url, type: "missing_title", severity: "critical", description: "Page is missing a meta title.", suggestion: "Add a descriptive meta title (50–60 chars)." });
    } else {
      titlesMap.set(metaTitle.toLowerCase(), (titlesMap.get(metaTitle.toLowerCase()) || 0) + 1);
    }

    // Meta description
    const metaDesc = page.metaDescription || "";
    if (!metaDesc) {
      missingDescriptions++;
      issues.push({ pageId: page.id, pageType: page.type, url, type: "missing_description", severity: "critical", description: "Page is missing a meta description.", suggestion: "Add a compelling meta description (150–160 chars)." });
    } else {
      descsMap.set(metaDesc.toLowerCase().slice(0, 50), (descsMap.get(metaDesc.toLowerCase().slice(0, 50)) || 0) + 1);
    }

    // H1 checks
    const h1Count = countH1(html);
    if (h1Count === 0) {
      missingH1++;
      issues.push({ pageId: page.id, pageType: page.type, url, type: "missing_h1", severity: "critical", description: "Page has no H1 heading.", suggestion: "Add a single, keyword-rich H1 heading." });
    } else if (h1Count > 1) {
      multipleH1++;
      issues.push({ pageId: page.id, pageType: page.type, url, type: "multiple_h1", severity: "important", description: `Page has ${h1Count} H1 headings.`, suggestion: "Use only one H1 per page." });
    }

    // Image ALT text
    const missingAltCount = countMissingAlt(html);
    if (missingAltCount > 0) {
      missingAlt += missingAltCount;
      issues.push({ pageId: page.id, pageType: page.type, url, type: "missing_alt", severity: "important", description: `${missingAltCount} image(s) missing ALT text.`, suggestion: "Add descriptive ALT text to all images." });
    }

    // Thin content
    const text = stripHtml(html);
    const wordCount = (text.match(/\b\w+\b/g) || []).length;
    if (wordCount < 300 && html.length > 0) {
      issues.push({ pageId: page.id, pageType: page.type, url, type: "thin_content", severity: "important", description: `Content has only ${wordCount} words.`, suggestion: "Expand content to at least 600 words." });
    }

    // Meta title length
    if (metaTitle && metaTitle.length > 65) {
      issues.push({ pageId: page.id, pageType: page.type, url, type: "long_title", severity: "important", description: `Meta title is ${metaTitle.length} characters (max 60).`, suggestion: "Shorten meta title to under 60 characters." });
    }
    if (metaTitle && metaTitle.length < 30 && metaTitle.length > 0) {
      issues.push({ pageId: page.id, pageType: page.type, url, type: "short_title", severity: "recommended", description: `Meta title is only ${metaTitle.length} characters.`, suggestion: "Expand meta title to 50–60 characters." });
    }
  }

  // Detect duplicate titles
  let duplicateTitles = 0;
  for (const [, count] of titlesMap) {
    if (count > 1) duplicateTitles += count - 1;
  }

  // Detect duplicate descriptions
  let duplicateDescriptions = 0;
  for (const [, count] of descsMap) {
    if (count > 1) duplicateDescriptions += count - 1;
  }

  if (duplicateTitles > 0) {
    issues.push({ pageId: "", pageType: "site", url: "/", type: "duplicate_titles", severity: "important", description: `${duplicateTitles} pages share duplicate meta titles.`, suggestion: "Ensure every page has a unique meta title." });
  }
  if (duplicateDescriptions > 0) {
    issues.push({ pageId: "", pageType: "site", url: "/", type: "duplicate_descriptions", severity: "important", description: `${duplicateDescriptions} pages share duplicate meta descriptions.`, suggestion: "Write unique meta descriptions for every page." });
  }

  // Calculate technical score
  const totalPages = pages.length;
  let technicalScore = 100;
  if (totalPages > 0) {
    const missTitleRatio = missingTitles / totalPages;
    const missDescRatio = missingDescriptions / totalPages;
    const missH1Ratio = missingH1 / totalPages;
    technicalScore -= Math.round(missTitleRatio * 25);
    technicalScore -= Math.round(missDescRatio * 20);
    technicalScore -= Math.round(missH1Ratio * 15);
    if (duplicateTitles > 0) technicalScore -= Math.min(10, duplicateTitles * 2);
    if (missingAlt > 5) technicalScore -= 5;
  }
  technicalScore = Math.max(0, Math.min(100, technicalScore));

  return {
    totalPages,
    indexedPages: totalPages - nonIndexed,
    nonIndexedPages: nonIndexed,
    missingTitles,
    duplicateTitles,
    missingDescriptions,
    duplicateDescriptions,
    missingH1,
    multipleH1,
    missingAlt,
    orphanPages: 0, // computed separately from link graph
    issues,
    technicalScore,
  };
}
