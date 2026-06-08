// SEO Score Calculator
// Scoring weights: Technical 25%, Content 25%, Entity 15%, InternalLink 15%, Schema 10%, CTR 10%

export interface PageScoreInput {
  // Technical
  hasMetaTitle: boolean;
  hasMetaDescription: boolean;
  hasH1: boolean;
  multipleH1: boolean;
  wordCount: number;
  readabilityScore: number;
  imagesCount: number;
  imagesWithAlt: number;
  isIndexed: boolean;
  // Content
  contentScore?: number;
  hasFaq: boolean;
  headingCount: number;
  // Entity
  entityScore?: number;
  // Internal Link
  internalLinksCount: number;
  isOrphan: boolean;
  // Schema
  hasSchema: boolean;
  schemaTypes?: string[];
  // CTR
  hasOptimizedTitle: boolean;
  hasOptimizedDesc: boolean;
}

export interface PageScores {
  technical: number;
  content: number;
  entity: number;
  internalLink: number;
  schema: number;
  ctr: number;
  overall: number;
}

export function calcPageScores(input: PageScoreInput): PageScores {
  // --- Technical Score (0-100) ---
  let technical = 100;
  if (!input.hasMetaTitle) technical -= 20;
  if (!input.hasMetaDescription) technical -= 20;
  if (!input.hasH1) technical -= 15;
  if (input.multipleH1) technical -= 10;
  if (!input.isIndexed) technical -= 10;
  if (input.wordCount < 300) technical -= 15;
  else if (input.wordCount < 600) technical -= 7;
  if (input.imagesCount > 0) {
    const altCoverage = input.imagesWithAlt / input.imagesCount;
    if (altCoverage < 1) technical -= Math.round((1 - altCoverage) * 10);
  }
  technical = Math.max(0, Math.min(100, technical));

  // --- Content Score (0-100) ---
  let content = input.contentScore ?? 50;
  if (input.hasFaq) content = Math.min(100, content + 10);
  if (input.headingCount >= 3) content = Math.min(100, content + 5);
  if (input.readabilityScore >= 60) content = Math.min(100, content + 5);
  content = Math.max(0, Math.min(100, content));

  // Compute from scratch if no contentScore provided
  if (!input.contentScore) {
    content = 40;
    if (input.wordCount >= 600) content += 15;
    else if (input.wordCount >= 300) content += 8;
    if (input.hasFaq) content += 15;
    if (input.headingCount >= 5) content += 15;
    else if (input.headingCount >= 3) content += 8;
    if (input.readabilityScore >= 70) content += 15;
    else if (input.readabilityScore >= 50) content += 10;
    else if (input.readabilityScore >= 40) content += 5;
    content = Math.min(100, content);
  }

  // --- Entity Score (0-100) ---
  const entity = Math.max(0, Math.min(100, input.entityScore ?? 30));

  // --- Internal Link Score (0-100) ---
  let internalLink = 50;
  if (input.isOrphan) internalLink = 0;
  else if (input.internalLinksCount >= 5) internalLink = 90;
  else if (input.internalLinksCount >= 3) internalLink = 75;
  else if (input.internalLinksCount >= 1) internalLink = 55;
  else internalLink = 20;

  // --- Schema Score (0-100) ---
  let schema = 0;
  if (input.hasSchema) {
    schema = 60;
    const types = input.schemaTypes || [];
    if (types.includes("FAQ")) schema += 15;
    if (types.includes("Article") || types.includes("BlogPosting")) schema += 15;
    if (types.includes("Organization") || types.includes("Service")) schema += 10;
    schema = Math.min(100, schema);
  }

  // --- CTR Score (0-100) ---
  let ctr = 40;
  if (input.hasOptimizedTitle) ctr += 30;
  if (input.hasOptimizedDesc) ctr += 30;
  ctr = Math.min(100, ctr);

  // --- Overall Score (weighted) ---
  const overall = Math.round(
    technical * 0.25 +
    content * 0.25 +
    entity * 0.15 +
    internalLink * 0.15 +
    schema * 0.10 +
    ctr * 0.10
  );

  return { technical, content, entity, internalLink, schema, ctr, overall };
}

export interface SiteScoreInput {
  pages: PageScores[];
  totalPages: number;
  indexedPages: number;
  brokenLinks: number;
  orphanPages: number;
  missingTitles: number;
  missingDescriptions: number;
}

export interface SiteScores {
  technical: number;
  content: number;
  entity: number;
  internalLink: number;
  schema: number;
  ctr: number;
  overall: number;
}

export function calcSiteScores(input: SiteScoreInput): SiteScores {
  if (input.pages.length === 0) {
    return { technical: 0, content: 0, entity: 0, internalLink: 0, schema: 0, ctr: 0, overall: 0 };
  }

  const avg = (key: keyof PageScores) =>
    Math.round(input.pages.reduce((s, p) => s + p[key], 0) / input.pages.length);

  let technical = avg("technical");
  // Penalize site-level issues
  if (input.brokenLinks > 0) technical = Math.max(0, technical - Math.min(20, input.brokenLinks * 2));
  if (input.totalPages > 0) {
    const indexRatio = input.indexedPages / input.totalPages;
    if (indexRatio < 0.9) technical = Math.max(0, technical - 10);
  }

  return {
    technical: Math.max(0, Math.min(100, technical)),
    content: avg("content"),
    entity: avg("entity"),
    internalLink: avg("internalLink"),
    schema: avg("schema"),
    ctr: avg("ctr"),
    overall: Math.round(
      Math.max(0, Math.min(100, technical)) * 0.25 +
      avg("content") * 0.25 +
      avg("entity") * 0.15 +
      avg("internalLink") * 0.15 +
      avg("schema") * 0.10 +
      avg("ctr") * 0.10
    ),
  };
}

export function getScoreLabel(score: number): string {
  if (score >= 80) return "Excellent";
  if (score >= 60) return "Good";
  if (score >= 40) return "Needs Work";
  return "Critical";
}

export function getScoreColor(score: number): string {
  if (score >= 80) return "#22c55e";
  if (score >= 60) return "#FFC300";
  if (score >= 40) return "#f97316";
  return "#ef4444";
}
