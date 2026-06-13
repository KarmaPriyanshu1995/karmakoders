import { prisma } from "@/lib/prisma";
import { buildPageUrl } from "@/lib/sitePages";
import { generateMetaTitle, generateMetaDescription, generateImageAlt, generateInternalLinkSuggestions, generateFaqQuestions } from "./aiRecommender";
import { generateOrganizationSchema, generateWebsiteSchema, generateArticleSchema, generateServiceSchema, generateFaqSchema } from "./schemaGenerator";
import { analyzePage } from "./analyzer";
import { calcPageScores, calcSiteScores } from "./scorer";
import { detectEntities, calcEntityScore } from "./entityDetector";
import { runAudit, AuditPage } from "./auditEngine";

// Recursive function to optimize ALT tags within strings and JSON nodes
export function traverseAndOptimizeAlts(obj: any, contextTitle: string): { modified: boolean; count: number } {
  let modified = false;
  let count = 0;

  if (!obj) return { modified, count };

  if (typeof obj === "string") {
    if (/<img[^>]*>/i.test(obj)) {
      const imgRegex = /<img([^>]*src=["']([^"']+)["']?[^>]*)>/gi;
      let newStr = obj;
      const matches = [...obj.matchAll(imgRegex)];
      for (const match of matches) {
        const fullTag = match[0];
        const attributes = match[1];
        const src = match[2];
        
        // If missing alt or has empty/blank alt
        if (!/alt=["']/i.test(attributes) || /alt=["']\s*["']/i.test(attributes)) {
          const altText = generateImageAlt(src, contextTitle);
          let newTag = fullTag;
          if (/alt=["']\s*["']/i.test(attributes)) {
            newTag = fullTag.replace(/alt=["']\s*["']/i, `alt="${altText}"`);
          } else {
            newTag = fullTag.replace("<img", `<img alt="${altText}"`);
          }
          newStr = newStr.replace(fullTag, newTag);
          modified = true;
          count++;
        }
      }
      return { modified: newStr !== obj, count };
    }
  } else if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      const res = traverseAndOptimizeAlts(obj[i], contextTitle);
      if (res.modified) {
        obj[i] = typeof obj[i] === "object" ? { ...obj[i] } : obj[i];
        modified = true;
        count += res.count;
      }
    }
  } else if (typeof obj === "object") {
    // Check if it's an image block with src/image and alt properties
    const srcKey = Object.keys(obj).find(k => k === "image" || k === "imageUrl" || k === "src");
    if (srcKey && typeof obj[srcKey] === "string") {
      const altKey = Object.keys(obj).find(k => k === "alt" || k === "altText");
      if (altKey) {
        if (!obj[altKey] || obj[altKey].trim() === "") {
          obj[altKey] = generateImageAlt(obj[srcKey], contextTitle);
          modified = true;
          count++;
        }
      } else {
        obj["alt"] = generateImageAlt(obj[srcKey], contextTitle);
        modified = true;
        count++;
      }
    }
    
    // Recurse into child fields
    for (const key of Object.keys(obj)) {
      const res = traverseAndOptimizeAlts(obj[key], contextTitle);
      if (res.modified) {
        obj[key] = typeof obj[key] === "object" ? (Array.isArray(obj[key]) ? [...obj[key]] : { ...obj[key] }) : obj[key];
        modified = true;
        count += res.count;
      }
    }
  }

  return { modified, count };
}

// Function to optimize a single page's metadata, ALT tags, schemas, and links
export async function optimizePage(
  pageId: string,
  pageType: string,
  rules: Record<string, boolean>
): Promise<{ success: boolean; logs: string[] }> {
  const localLogs: string[] = [];
  let pageTitle = "";
  let pageSlug = "";
  let pageContent: string | null = null;
  let pageUrl = "";
  let imageUrl: string | null = null;
  let createdAt = new Date();

  // 1. Fetch page data based on type
  if (pageType === "post") {
    const post = await prisma.post.findUnique({ where: { id: pageId } });
    if (!post) throw new Error(`Post not found: ${pageId}`);
    pageTitle = post.title;
    pageSlug = post.slug;
    pageContent = post.content;
    imageUrl = post.image;
    createdAt = post.createdAt;
    pageUrl = `/blog/${post.slug}`;
  } else if (pageType === "project") {
    const project = await prisma.project.findUnique({ where: { id: pageId } });
    if (!project) throw new Error(`Project not found: ${pageId}`);
    pageTitle = project.title;
    pageSlug = project.slug;
    pageContent = project.content;
    imageUrl = project.imageUrl;
    createdAt = project.createdAt;
    pageUrl = buildPageUrl(project.slug, "project");
  } else {
    // page
    const page = await prisma.page.findUnique({ where: { id: pageId } });
    if (!page) throw new Error(`Page not found: ${pageId}`);
    pageTitle = page.title;
    pageSlug = page.slug;
    pageUrl = buildPageUrl(page.slug, "page");
  }

  // 2. Fetch or parse existing seoMeta
  let currentMeta: { title?: string; description?: string } = {};
  if (pageType === "post") {
    const post = await prisma.post.findUnique({ where: { id: pageId }, select: { seoMeta: true } });
    if (post?.seoMeta) {
      try { currentMeta = JSON.parse(post.seoMeta); } catch {}
    }
  } else if (pageType === "page") {
    const page = await prisma.page.findUnique({ where: { id: pageId }, select: { seoMeta: true } });
    if (page?.seoMeta) {
      try { currentMeta = JSON.parse(page.seoMeta); } catch {}
    }
  }

  const beforeTitle = currentMeta.title || "Missing";
  const beforeDesc = currentMeta.description || "Missing";

  // Apply Meta Rules
  let metaUpdated = false;
  if (rules.meta_title && !currentMeta.title) {
    currentMeta.title = generateMetaTitle({ title: pageTitle, url: pageUrl });
    metaUpdated = true;
    localLogs.push(`Generated meta title: "${currentMeta.title}"`);
  }
  if (rules.meta_desc && !currentMeta.description) {
    currentMeta.description = generateMetaDescription({ title: pageTitle, url: pageUrl });
    metaUpdated = true;
    localLogs.push(`Generated meta description: "${currentMeta.description}"`);
  }

  if (metaUpdated) {
    const seoMeta = JSON.stringify(currentMeta);
    if (pageType === "post") {
      await prisma.post.update({ where: { id: pageId }, data: { seoMeta } });
    } else if (pageType === "page") {
      await prisma.page.update({ where: { id: pageId }, data: { seoMeta } });
    }
    
    // Log meta optimization success
    await prisma.seoAutomationLog.create({
      data: {
        action: `optimize_meta_tags`,
        pageId,
        pageType,
        url: pageUrl,
        before: `Title: ${beforeTitle} | Desc: ${beforeDesc}`,
        after: `Title: ${currentMeta.title} | Desc: ${currentMeta.description}`,
        status: "success",
        triggeredBy: "auto",
      },
    });
  }

  // Apply ALT Tags Rule
  let altReplacedCount = 0;
  if (rules.alt_tags) {
    if (pageType === "post" && pageContent) {
      const imgRegex = /<img([^>]*src=["']([^"']+)["']?[^>]*)>/gi;
      let newContent = pageContent;
      const matches = [...pageContent.matchAll(imgRegex)];
      
      for (const match of matches) {
        const fullTag = match[0];
        const attributes = match[1];
        const src = match[2];
        if (!/alt=["']/i.test(attributes) || /alt=["']\s*["']/i.test(attributes)) {
          const altText = generateImageAlt(src, pageTitle);
          let newTag = fullTag;
          if (/alt=["']\s*["']/i.test(attributes)) {
            newTag = fullTag.replace(/alt=["']\s*["']/i, `alt="${altText}"`);
          } else {
            newTag = fullTag.replace("<img", `<img alt="${altText}"`);
          }
          newContent = newContent.replace(fullTag, newTag);
          altReplacedCount++;
        }
      }

      if (newContent !== pageContent) {
        await prisma.post.update({ where: { id: pageId }, data: { content: newContent } });
        pageContent = newContent;
        localLogs.push(`Injected alt tags for ${altReplacedCount} image(s) in post content.`);
      }
    } else if (pageType === "project" && pageContent) {
      const imgRegex = /<img([^>]*src=["']([^"']+)["']?[^>]*)>/gi;
      let newContent = pageContent;
      const matches = [...pageContent.matchAll(imgRegex)];
      
      for (const match of matches) {
        const fullTag = match[0];
        const attributes = match[1];
        const src = match[2];
        if (!/alt=["']/i.test(attributes) || /alt=["']\s*["']/i.test(attributes)) {
          const altText = generateImageAlt(src, pageTitle);
          let newTag = fullTag;
          if (/alt=["']\s*["']/i.test(attributes)) {
            newTag = fullTag.replace(/alt=["']\s*["']/i, `alt="${altText}"`);
          } else {
            newTag = fullTag.replace("<img", `<img alt="${altText}"`);
          }
          newContent = newContent.replace(fullTag, newTag);
          altReplacedCount++;
        }
      }

      if (newContent !== pageContent) {
        await prisma.project.update({ where: { id: pageId }, data: { content: newContent } });
        pageContent = newContent;
        localLogs.push(`Injected alt tags for ${altReplacedCount} image(s) in project content.`);
      }
    } else if (pageType === "page") {
      const sections = await prisma.section.findMany({ where: { pageId } });
      for (const s of sections) {
        try {
          const parsed = JSON.parse(s.content);
          const res = traverseAndOptimizeAlts(parsed, pageTitle);
          if (res.modified) {
            await prisma.section.update({
              where: { id: s.id },
              data: { content: JSON.stringify(parsed) }
            });
            altReplacedCount += res.count;
          }
        } catch {}
      }
      
      if (altReplacedCount > 0) {
        localLogs.push(`Injected alt tags for ${altReplacedCount} image(s) in page sections.`);
      }
    }

    if (altReplacedCount > 0) {
      await prisma.seoAutomationLog.create({
        data: {
          action: "generate_alt_tags",
          pageId,
          pageType,
          url: pageUrl,
          before: "Unoptimized image alt attributes",
          after: `Injected alt attributes for ${altReplacedCount} image(s)`,
          status: "success",
          triggeredBy: "auto",
        },
      });
    }
  }

  // Apply Schema Rule
  let hasSchema = false;
  let schemaTypesList: string[] = [];
  if (rules.schema) {
    let schemaObj: any = null;
    let schemaType = "";

    if (pageType === "post") {
      schemaObj = generateArticleSchema({
        title: pageTitle,
        description: currentMeta.description || undefined,
        url: pageUrl,
        imageUrl: imageUrl || undefined,
        publishedAt: createdAt.toISOString(),
      });
      schemaType = "Article";
    } else if (pageType === "project") {
      schemaObj = generateServiceSchema({
        name: pageTitle,
        description: currentMeta.description || undefined,
        url: pageUrl,
        provider: "Karmakoders",
        providerUrl: "https://karmakoders.com",
      });
      schemaType = "Service";
    } else {
      // page
      if (pageSlug === "home" || pageSlug === "index") {
        schemaObj = generateOrganizationSchema({
          name: "Karmakoders",
          url: "https://karmakoders.com",
          description: "KarmaKoders is an elite web development and SEO consulting agency.",
        });
        schemaType = "Organization";
      } else {
        schemaObj = generateWebsiteSchema({
          name: pageTitle,
          url: `https://karmakoders.com${pageUrl}`,
          description: currentMeta.description || undefined,
        });
        schemaType = "Website";
      }
    }

    if (schemaObj) {
      await prisma.seoSchema.deleteMany({ where: { pageId, schemaType } });
      await prisma.seoSchema.create({
        data: {
          pageType,
          pageId,
          schemaType,
          schemaJson: JSON.stringify(schemaObj),
          isValid: true,
          isApplied: true,
        },
      });
      localLogs.push(`Generated and applied ${schemaType} JSON-LD structured data.`);
      hasSchema = true;
      schemaTypesList.push(schemaType);

      await prisma.seoAutomationLog.create({
        data: {
          action: "generate_schema",
          pageId,
          pageType,
          url: pageUrl,
          before: "No structured data schema",
          after: `Applied valid JSON-LD schema: ${schemaType}`,
          status: "success",
          triggeredBy: "auto",
        },
      });
    }

    // Also auto-generate FAQ schema if content contains FAQ patterns
    const contentText = pageContent || "";
    const isFaqPage = /faq|frequently asked|questions/i.test(contentText) || /faq/i.test(pageTitle);
    if (isFaqPage && pageType !== "project") {
      const faqs = generateFaqQuestions({ url: pageUrl, title: pageTitle, primaryKeyword: pageTitle });
      const faqSchema = generateFaqSchema({ questions: faqs });
      
      await prisma.seoSchema.deleteMany({ where: { pageId, schemaType: "FAQ" } });
      await prisma.seoSchema.create({
        data: {
          pageType,
          pageId,
          schemaType: "FAQ",
          schemaJson: JSON.stringify(faqSchema),
          isValid: true,
          isApplied: true,
        },
      });
      localLogs.push("Generated and applied FAQ Page schema markup.");
      schemaTypesList.push("FAQ");
    }
  }

  // Apply Internal Links Rule
  let internalLinksCount = 0;
  if (rules.internal_links) {
    const [pages, posts, projects] = await Promise.all([
      prisma.page.findMany({ select: { id: true, slug: true, title: true } }),
      prisma.post.findMany({ select: { id: true, slug: true, title: true } }),
      prisma.project.findMany({ select: { id: true, slug: true, title: true } }),
    ]);

    const allPagesWithType = [
      ...pages.map((p) => ({ ...p, type: "page" as const })),
      ...posts.map((p) => ({ ...p, type: "post" as const })),
      ...projects.map((p) => ({ ...p, type: "project" as const })),
    ];

    const allPagesFlattened = allPagesWithType.map((p) => ({
      title: p.title,
      slug: p.slug,
      url: buildPageUrl(p.slug, p.type),
    }));

    const linkSuggestions = generateInternalLinkSuggestions(pageTitle, allPagesFlattened);
    
    // Clear old suggested internal links
    await prisma.seoInternalLink.deleteMany({
      where: { fromPageId: pageId, isSuggested: true },
    });

    for (const sug of linkSuggestions) {
      const matchPage = allPagesWithType.find((p) => buildPageUrl(p.slug, p.type) === sug.url);

      if (matchPage) {
        await prisma.seoInternalLink.create({
          data: {
            fromPageId: pageId,
            toPageId: matchPage.id,
            url: sug.url,
            anchorText: sug.anchorText,
            isSuggested: true,
          },
        });
        internalLinksCount++;
      }
    }

    if (internalLinksCount > 0) {
      localLogs.push(`Generated ${internalLinksCount} internal link suggestions based on semantic topical overlap.`);
      await prisma.seoAutomationLog.create({
        data: {
          action: "suggest_links",
          pageId,
          pageType,
          url: pageUrl,
          before: "No internal links mapped",
          after: `Mapped ${internalLinksCount} semantically relevant link suggestion(s)`,
          status: "success",
          triggeredBy: "auto",
        },
      });
    }
  }

  // 3. Recalculate SEO score and update SeoPage table
  const analysisResult = analyzePage({
    title: pageTitle,
    metaTitle: currentMeta.title,
    metaDescription: currentMeta.description,
    content: pageContent || "",
    slug: pageSlug,
  });

  const entities = detectEntities((pageContent || "") + " " + pageTitle);
  const entityScore = calcEntityScore(entities.length, 10);

  const existingSchemaEntries = await prisma.seoSchema.findMany({ where: { pageId } });
  const hasPageSchema = existingSchemaEntries.length > 0;
  const pageSchemaTypes = existingSchemaEntries.map((s) => s.schemaType);

  const internalLinks = await prisma.seoInternalLink.findMany({ where: { fromPageId: pageId } });

  const scoreData = calcPageScores({
    hasMetaTitle: !!analysisResult.metaTitle,
    hasMetaDescription: !!analysisResult.metaDescription,
    hasH1: !!analysisResult.h1,
    multipleH1: analysisResult.headings.filter((h) => h.level === 1).length > 1,
    wordCount: analysisResult.wordCount,
    readabilityScore: analysisResult.readabilityScore,
    imagesCount: analysisResult.imagesCount,
    imagesWithAlt: analysisResult.imagesWithAlt,
    isIndexed: true,
    hasFaq: analysisResult.hasFaq,
    headingCount: analysisResult.headings.length,
    entityScore,
    internalLinksCount: internalLinks.length,
    isOrphan: internalLinks.length === 0,
    hasSchema: hasPageSchema,
    schemaTypes: pageSchemaTypes,
    hasOptimizedTitle: (analysisResult.metaTitle?.length || 0) >= 50 && (analysisResult.metaTitle?.length || 0) <= 60,
    hasOptimizedDesc: (analysisResult.metaDescription?.length || 0) >= 140 && (analysisResult.metaDescription?.length || 0) <= 160,
  });

  await prisma.seoPage.upsert({
    where: { pageType_pageId: { pageType: pageType || "page", pageId } },
    create: {
      pageType,
      pageId,
      url: pageUrl,
      title: pageTitle,
      metaTitle: currentMeta.title || null,
      metaDescription: currentMeta.description || null,
      h1: analysisResult.h1,
      headingsJson: JSON.stringify(analysisResult.headings),
      wordCount: analysisResult.wordCount,
      readabilityScore: analysisResult.readabilityScore,
      keywordDensityJson: JSON.stringify(analysisResult.keywordDensity),
      imagesCount: analysisResult.imagesCount,
      imagesWithAlt: analysisResult.imagesWithAlt,
      hasFaq: analysisResult.hasFaq,
      hasSchema: hasPageSchema,
      schemaTypes: pageSchemaTypes.join(","),
      contentScore: scoreData.content,
      technicalScore: scoreData.technical,
      entityScore: scoreData.entity,
      internalLinkScore: scoreData.internalLink,
      schemaScore: scoreData.schema,
      ctrScore: scoreData.ctr,
      overallScore: scoreData.overall,
      issuesJson: JSON.stringify(analysisResult.issues),
      lastAnalyzed: new Date(),
    },
    update: {
      title: pageTitle,
      metaTitle: currentMeta.title || null,
      metaDescription: currentMeta.description || null,
      h1: analysisResult.h1,
      headingsJson: JSON.stringify(analysisResult.headings),
      wordCount: analysisResult.wordCount,
      readabilityScore: analysisResult.readabilityScore,
      keywordDensityJson: JSON.stringify(analysisResult.keywordDensity),
      imagesCount: analysisResult.imagesCount,
      imagesWithAlt: analysisResult.imagesWithAlt,
      hasFaq: analysisResult.hasFaq,
      hasSchema: hasPageSchema,
      schemaTypes: pageSchemaTypes.join(","),
      contentScore: scoreData.content,
      technicalScore: scoreData.technical,
      entityScore: scoreData.entity,
      internalLinkScore: scoreData.internalLink,
      schemaScore: scoreData.schema,
      ctrScore: scoreData.ctr,
      overallScore: scoreData.overall,
      issuesJson: JSON.stringify(analysisResult.issues),
      lastAnalyzed: new Date(),
    },
  });

  return { success: true, logs: localLogs };
}

// Function to generate the Weekly Health Report
export async function runWeeklyHealthReport(): Promise<{ success: boolean; reportId: string; logs: string[] }> {
  const localLogs: string[] = [];

  // 1. Gather all pages, posts, and projects
  const [pages, posts, projects, seoPages, latestAudit, issues, brand, searchConsole] = await Promise.all([
    prisma.page.findMany({ select: { id: true, slug: true, title: true, seoMeta: true, isPublished: true } }),
    prisma.post.findMany({ select: { id: true, slug: true, title: true, seoMeta: true, published: true, content: true } }),
    prisma.project.findMany({ select: { id: true, slug: true, title: true, content: true } }),
    prisma.seoPage.findMany(),
    prisma.seoAudit.findFirst({ orderBy: { runAt: "desc" } }),
    prisma.seoIssue.findMany({ where: { isFixed: false } }),
    prisma.seoBrand.findFirst(),
    prisma.seoSearchConsole.findFirst({ orderBy: { fetchedAt: "desc" } }),
  ]);

  const auditPages: AuditPage[] = [
    ...pages.map((p) => {
      const meta = p.seoMeta ? JSON.parse(p.seoMeta) : {};
      return { id: p.id, type: "page" as const, title: p.title, metaTitle: meta.title, metaDescription: meta.description, slug: p.slug, isIndexed: p.isPublished };
    }),
    ...posts.map((p) => {
      const meta = p.seoMeta ? JSON.parse(p.seoMeta) : {};
      return { id: p.id, type: "post" as const, title: p.title, metaTitle: meta.title, metaDescription: meta.description, slug: p.slug, content: p.content, isIndexed: p.published };
    }),
    ...projects.map((p) => ({
      id: p.id, type: "project" as const, title: p.title, metaTitle: null, metaDescription: null, slug: p.slug, content: p.content, isIndexed: true,
    })),
  ];

  const auditResult = runAudit(auditPages);

  // Compute average scores
  const pageScores = seoPages.map((sp) => ({
    technical: sp.technicalScore,
    content: sp.contentScore,
    entity: sp.entityScore,
    internalLink: sp.internalLinkScore,
    schema: sp.schemaScore,
    ctr: sp.ctrScore,
    overall: sp.overallScore,
  }));

  const siteScores = pageScores.length > 0
    ? calcSiteScores({
        pages: pageScores,
        totalPages: auditResult.totalPages,
        indexedPages: auditResult.indexedPages,
        brokenLinks: latestAudit?.brokenLinks || 0,
        orphanPages: latestAudit?.orphanPages || 0,
        missingTitles: auditResult.missingTitles,
        missingDescriptions: auditResult.missingDescriptions,
      })
    : { technical: auditResult.technicalScore, content: 50, entity: 30, internalLink: 50, schema: 0, ctr: 40, overall: 50 };

  const summary = {
    scores: siteScores,
    audit: {
      totalPages: auditResult.totalPages,
      indexedPages: auditResult.indexedPages,
      nonIndexedPages: auditResult.nonIndexedPages,
      missingTitles: auditResult.missingTitles,
      missingDescriptions: auditResult.missingDescriptions,
      brokenLinks: latestAudit?.brokenLinks || 0,
      orphanPages: latestAudit?.orphanPages || 0,
      issuesCount: issues.length,
    },
    searchConsole: searchConsole ? {
      clicks: searchConsole.totalClicks,
      impressions: searchConsole.totalImpressions,
      ctr: searchConsole.avgCtr,
      position: searchConsole.avgPosition,
    } : null,
    generatedAt: new Date().toISOString(),
  };

  const reportTitle = `SEO Weekly Health Report - ${new Date().toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`;

  const report = await prisma.seoReport.create({
    data: {
      type: "weekly",
      title: reportTitle,
      summaryJson: JSON.stringify(summary),
    },
  });

  localLogs.push(`Successfully compiled and archived Weekly SEO Health Report: "${reportTitle}".`);
  
  await prisma.seoAutomationLog.create({
    data: {
      action: "generate_report",
      before: "Pre-audit state",
      after: `Archived Weekly Report ID: ${report.id} | Health Score: ${siteScores.overall}`,
      status: "success",
      triggeredBy: "auto",
    },
  });

  return { success: true, reportId: report.id, logs: localLogs };
}
