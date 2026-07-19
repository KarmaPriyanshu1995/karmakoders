import * as fs from "fs";
import * as path from "path";
import { buildPageUrl } from "@/lib/sitePages";

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

export interface InternalLinkItem {
  fromPageId: string;
  fromPageType: string;
  toPageId?: string | null;
  toPageType?: string | null;
  url: string;
  anchorText: string;
  isBroken: boolean;
  isExternal: boolean;
}

export interface AsyncAuditResult extends AuditResult {
  brokenLinks: number;
  internalLinks: InternalLinkItem[];
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

function buildUrl(page: { type: string; slug: string }): string {
  return buildPageUrl(page.slug, page.type as "page" | "post" | "project");
}

// Validates an external link using HTTP HEAD/GET
async function checkExternalLink(url: string): Promise<{ isBroken: boolean; size?: number }> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1000);
    const res = await fetch(url, {
      method: "HEAD",
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) SEOAuditEngine/1.0",
      },
    });
    clearTimeout(timeoutId);
    
    let ok = res.ok;
    let size: number | undefined;
    const contentLength = res.headers.get("content-length");
    if (contentLength) {
      size = parseInt(contentLength, 10);
    }
    
    if (ok) return { isBroken: false, size };

    // Try GET if HEAD fails
    const getController = new AbortController();
    const getTimeoutId = setTimeout(() => getController.abort(), 1000);
    const getRes = await fetch(url, {
      method: "GET",
      signal: getController.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) SEOAuditEngine/1.0",
      },
    });
    clearTimeout(getTimeoutId);
    
    const getContentLength = getRes.headers.get("content-length");
    if (getContentLength) {
      size = parseInt(getContentLength, 10);
    }
    
    return { isBroken: !getRes.ok, size };
  } catch {
    return { isBroken: true };
  }
}

async function validateExternalUrls(urls: string[]): Promise<Map<string, { isBroken: boolean; size?: number }>> {
  const results = new Map<string, { isBroken: boolean; size?: number }>();
  const batchSize = 25;
  for (let i = 0; i < urls.length; i += batchSize) {
    const batch = urls.slice(i, i + batchSize);
    await Promise.all(
      batch.map(async (url) => {
        const res = await checkExternalLink(url);
        results.set(url, res);
      })
    );
  }
  return results;
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

export async function runAuditAsync(
  pages: AuditPage[]
): Promise<AsyncAuditResult> {
  const issues: AuditIssue[] = [];
  const titlesMap = new Map<string, number>();
  const descsMap = new Map<string, number>();

  let missingTitles = 0;
  let missingDescriptions = 0;
  let missingH1 = 0;
  let multipleH1 = 0;
  let missingAlt = 0;
  let nonIndexed = 0;
  let brokenLinksCount = 0;

  // Build a set of all valid internal URLs in the system
  const urlToPageMap = new Map<string, AuditPage>();
  for (const page of pages) {
    const url = buildUrl(page);
    urlToPageMap.set(url, page);
    if (url !== "/") {
      urlToPageMap.set(url + "/", page);
    }
  }

  // To track links
  const internalLinks: InternalLinkItem[] = [];
  const externalUrlsToValidate = new Set<string>();
  const externalImageUrlsToValidate = new Set<string>();

  // To track page image file size checks
  const localPublicDir = path.join(process.cwd(), "public");

  // Step 1: Parse all pages for metadata, headings, images, and links
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

    // Heading sequence check
    const headings: { level: number; text: string }[] = [];
    const hRegex = /<h([1-6])[^>]*>(.*?)<\/h[1-6]>/gi;
    let hMatch;
    while ((hMatch = hRegex.exec(html)) !== null) {
      headings.push({ level: parseInt(hMatch[1]), text: hMatch[2].replace(/<[^>]*>/g, "").trim() });
    }
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
        pageId: page.id,
        pageType: page.type,
        url,
        type: "heading_hierarchy_skipped",
        severity: "recommended",
        description: "Heading levels are skipped (e.g. H2 followed directly by H4).",
        suggestion: "Ensure heading tags follow a sequential nested order (H1 -> H2 -> H3)."
      });
    }

    // Image Alt and Format checks
    const imgs = html.match(/<img[^>]*>/gi) || [];
    let missingAltCount = 0;
    let unoptimizedImages = 0;
    let missingDimensions = 0;

    for (const img of imgs) {
      const hasAlt = /alt=["'][^"']+["']/i.test(img);
      if (!hasAlt) {
        missingAltCount++;
      }

      const srcMatch = img.match(/src=["']([^"']+)["']/i);
      if (srcMatch) {
        const imgSrc = srcMatch[1];
        const lowerSrc = imgSrc.toLowerCase();

        // Check format
        if (lowerSrc.endsWith(".png") || lowerSrc.endsWith(".jpg") || lowerSrc.endsWith(".jpeg") || lowerSrc.endsWith(".gif")) {
          unoptimizedImages++;
        }

        // Check file size (local)
        if (imgSrc.startsWith("/") && !imgSrc.startsWith("//") && !lowerSrc.startsWith("http")) {
          const localPath = path.join(localPublicDir, imgSrc.split("?")[0]);
          if (fs.existsSync(localPath)) {
            const stats = fs.statSync(localPath);
            const sizeInKb = Math.round(stats.size / 1024);
            if (stats.size > 500 * 1024) {
              issues.push({
                pageId: page.id,
                pageType: page.type,
                url,
                type: "large_image_size",
                severity: "critical",
                description: `Local image "${imgSrc}" is very large: ${sizeInKb}KB (limit 500KB).`,
                suggestion: "Compress and resize the image, or convert to WebP/AVIF format."
              });
            } else if (stats.size > 100 * 1024) {
              issues.push({
                pageId: page.id,
                pageType: page.type,
                url,
                type: "large_image_size",
                severity: "important",
                description: `Local image "${imgSrc}" is large: ${sizeInKb}KB (limit 100KB).`,
                suggestion: "Compress the image to under 100KB to speed up page loads."
              });
            }
          }
        } else if (lowerSrc.startsWith("http")) {
          externalImageUrlsToValidate.add(imgSrc);
        }
      }

      const hasWidth = /width=["'][^"']+["']/i.test(img);
      const hasHeight = /height=["'][^"']+["']/i.test(img);
      if (!hasWidth || !hasHeight) {
        missingDimensions++;
      }
    }

    if (missingAltCount > 0) {
      missingAlt += missingAltCount;
      issues.push({ pageId: page.id, pageType: page.type, url, type: "missing_alt", severity: "important", description: `${missingAltCount} image(s) missing ALT text.`, suggestion: "Add descriptive ALT text to all images." });
    }
    if (unoptimizedImages > 0) {
      issues.push({ pageId: page.id, pageType: page.type, url, type: "unoptimized_image_format", severity: "important", description: `${unoptimizedImages} image(s) use unoptimized formats (PNG/JPG).`, suggestion: "Convert images to modern formats like WebP or AVIF." });
    }
    if (missingDimensions > 0) {
      issues.push({ pageId: page.id, pageType: page.type, url, type: "missing_image_dimensions", severity: "recommended", description: `${missingDimensions} image(s) missing width/height dimensions.`, suggestion: "Provide width and height attributes to avoid Layout Shifts." });
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

    // Link Extraction
    const aRegex = /<a\s+[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
    let aMatch;
    while ((aMatch = aRegex.exec(html)) !== null) {
      const rawHref = aMatch[1];
      const anchorText = stripHtml(aMatch[2]).trim() || "[No Text]";

      if (rawHref.startsWith("#") || rawHref.startsWith("mailto:") || rawHref.startsWith("tel:") || rawHref.startsWith("javascript:")) {
        continue;
      }

      const cleanHref = rawHref.split("#")[0].split("?")[0].trim();
      if (!cleanHref) continue;

      const isExternal = cleanHref.startsWith("http://") || cleanHref.startsWith("https://") || cleanHref.startsWith("//");

      if (!isExternal) {
        let resolvedLocalUrl = cleanHref;
        if (!resolvedLocalUrl.startsWith("/")) {
          resolvedLocalUrl = "/" + resolvedLocalUrl;
        }

        const targetPage = urlToPageMap.get(resolvedLocalUrl);
        const isBroken = !targetPage;

        if (isBroken) {
          brokenLinksCount++;
          issues.push({
            pageId: page.id,
            pageType: page.type,
            url,
            type: "broken_internal_link",
            severity: "critical",
            description: `Broken internal link pointing to "${cleanHref}".`,
            suggestion: "Update the link destination to a valid page slug."
          });
        }

        internalLinks.push({
          fromPageId: page.id,
          fromPageType: page.type,
          toPageId: targetPage?.id || null,
          toPageType: targetPage?.type || null,
          url: cleanHref,
          anchorText,
          isBroken,
          isExternal: false
        });
      } else {
        externalUrlsToValidate.add(cleanHref);
        internalLinks.push({
          fromPageId: page.id,
          fromPageType: page.type,
          url: cleanHref,
          anchorText,
          isBroken: false,
          isExternal: true
        });
      }
    }
  }

  // Step 2: Validate unique external URLs
  const uniqueExtUrls = Array.from(externalUrlsToValidate);
  const extValidationResults = await validateExternalUrls(uniqueExtUrls);

  // Validate external images
  const uniqueExtImageUrls = Array.from(externalImageUrlsToValidate);
  const extImageValidationResults = await validateExternalUrls(uniqueExtImageUrls);

  // Update validation status for external links
  for (const link of internalLinks) {
    if (link.isExternal) {
      const res = extValidationResults.get(link.url);
      if (res?.isBroken) {
        link.isBroken = true;
        brokenLinksCount++;
        issues.push({
          pageId: link.fromPageId,
          pageType: link.fromPageType,
          url: buildUrl(pages.find(p => p.id === link.fromPageId) as AuditPage),
          type: "broken_external_link",
          severity: "important",
          description: `Broken external link: "${link.url}" is unreachable or returns error.`,
          suggestion: "Fix the URL spelling or remove the link."
        });
      }
    }
  }

  // Log issues for large external images
  for (const page of pages) {
    const html = page.content || "";
    const url = buildUrl(page);
    const imgs = html.match(/<img[^>]*>/gi) || [];
    for (const img of imgs) {
      const srcMatch = img.match(/src=["']([^"']+)["']/i);
      if (srcMatch) {
        const imgSrc = srcMatch[1];
        if (imgSrc.toLowerCase().startsWith("http")) {
          const res = extImageValidationResults.get(imgSrc);
          if (res?.size) {
            const sizeInKb = Math.round(res.size / 1024);
            if (res.size > 500 * 1024) {
              issues.push({
                pageId: page.id,
                pageType: page.type,
                url,
                type: "large_image_size",
                severity: "critical",
                description: `External image "${imgSrc}" is very large: ${sizeInKb}KB (limit 500KB).`,
                suggestion: "Compress and resize the image, or host it locally."
              });
            } else if (res.size > 100 * 1024) {
              issues.push({
                pageId: page.id,
                pageType: page.type,
                url,
                type: "large_image_size",
                severity: "important",
                description: `External image "${imgSrc}" is large: ${sizeInKb}KB (limit 100KB).`,
                suggestion: "Optimize the image size to reduce network payload."
              });
            }
          }
        }
      }
    }
  }

  // Step 3: Detect duplicate titles/descriptions
  let duplicateTitles = 0;
  for (const [, count] of titlesMap) {
    if (count > 1) duplicateTitles += count - 1;
  }

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

  // Step 4: Detect orphan pages
  const incomingLinksCount = new Map<string, number>();
  for (const page of pages) {
    incomingLinksCount.set(page.id, 0);
  }

  for (const link of internalLinks) {
    if (!link.isExternal && link.toPageId && link.toPageId !== link.fromPageId) {
      incomingLinksCount.set(link.toPageId, (incomingLinksCount.get(link.toPageId) || 0) + 1);
    }
  }

  let orphanPagesCount = 0;
  for (const page of pages) {
    const url = buildUrl(page);
    const count = incomingLinksCount.get(page.id) || 0;

    if (page.published !== false && url !== "/" && count === 0) {
      orphanPagesCount++;
      issues.push({
        pageId: page.id,
        pageType: page.type,
        url,
        type: "orphan_page",
        severity: "important",
        description: "Page is an orphan page (no incoming internal links pointing to it).",
        suggestion: "Add links to this page from other related pages or navigation menus."
      });
    }
  }

  // Step 5: Calculate technical score
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
    if (brokenLinksCount > 0) technicalScore -= Math.min(15, brokenLinksCount * 3);
    if (orphanPagesCount > 0) technicalScore -= Math.min(10, orphanPagesCount * 2);
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
    brokenLinks: brokenLinksCount,
    orphanPages: orphanPagesCount,
    issues,
    internalLinks,
    technicalScore,
  };
}
