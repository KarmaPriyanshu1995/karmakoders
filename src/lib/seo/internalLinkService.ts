import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { buildPageUrl } from "@/lib/sitePages";
import { generateInternalLinkSuggestions } from "./aiRecommender";
import { getPageSectionsPayload, savePageSections, type SectionPayload } from "@/lib/pageSectionsApi";

export type RecommendationType =
  | "topical_overlap"
  | "orphan_recovery"
  | "weak_link_boost"
  | "funnel";

export interface PageRef {
  id: string;
  title: string;
  url: string;
  type: "page" | "post" | "project";
}

export interface InternalLinkRecommendation {
  id: string;
  sourcePage: PageRef;
  targetPage: PageRef;
  anchorText: string;
  relevanceScore: number;
  recommendationType: RecommendationType;
  reason: string;
  status: "pending" | "applied";
}

interface PageRecord {
  id: string;
  title: string;
  slug: string;
  type: "page" | "post" | "project";
}

export class ApplyLinkError extends Error {
  constructor(
    message: string,
    public statusCode: 404 | 409 | 500 = 500
  ) {
    super(message);
    this.name = "ApplyLinkError";
  }
}

async function loadAllPages(): Promise<PageRecord[]> {
  const [pages, posts, projects] = await Promise.all([
    prisma.page.findMany({ select: { id: true, slug: true, title: true } }),
    prisma.post.findMany({ select: { id: true, slug: true, title: true } }),
    prisma.project.findMany({ select: { id: true, slug: true, title: true } }),
  ]);

  return [
    ...pages.map((p) => ({ ...p, type: "page" as const })),
    ...posts.map((p) => ({ ...p, type: "post" as const })),
    ...projects.map((p) => ({ ...p, type: "project" as const })),
  ];
}

async function resolvePageById(id: string): Promise<PageRecord | null> {
  if (!id) return null;

  const page = await prisma.page.findUnique({
    where: { id },
    select: { id: true, slug: true, title: true },
  });
  if (page) return { ...page, type: "page" };

  const post = await prisma.post.findUnique({
    where: { id },
    select: { id: true, slug: true, title: true },
  });
  if (post) return { ...post, type: "post" };

  const project = await prisma.project.findUnique({
    where: { id },
    select: { id: true, slug: true, title: true },
  });
  if (project) return { ...project, type: "project" };

  return null;
}

function toPageRef(record: PageRecord): PageRef {
  return {
    id: record.id,
    title: record.title,
    url: buildPageUrl(record.slug, record.type),
    type: record.type,
  };
}

function countWordOverlap(sourceTitle: string, targetTitle: string): number {
  const sourceWords = (sourceTitle || "").toLowerCase().split(/\s+/);
  const targetWords = (targetTitle || "").toLowerCase().split(/\s+/);
  return sourceWords.filter((w) => w.length > 3 && targetWords.includes(w)).length;
}

function deriveRecommendationType(
  source: PageRecord,
  target: PageRecord,
  targetIsOrphan: boolean,
  sourceOutgoingCount: number
): RecommendationType {
  const sourceSlug = source.slug.toLowerCase();
  const targetSlug = target.slug.toLowerCase();

  if (targetIsOrphan) return "orphan_recovery";

  const funnelSources = ["home", "about"];
  const funnelTargets = ["services", "contact", "case-studies", "portfolio"];
  if (
    funnelSources.includes(sourceSlug) &&
    funnelTargets.some((s) => targetSlug.includes(s))
  ) {
    return "funnel";
  }

  if (sourceOutgoingCount < 3) return "weak_link_boost";

  return "topical_overlap";
}

function computeRelevanceScore(
  overlapWords: number,
  targetIsOrphan: boolean,
  sourceOutgoingCount: number
): number {
  let score = overlapWords * 20;
  if (targetIsOrphan) score += 30;
  if (sourceOutgoingCount < 3) score += 15;
  return Math.min(100, Math.max(10, score));
}

async function getSeoPageMeta(pageType: string, pageId: string) {
  return prisma.seoPage.findFirst({
    where: { pageType, pageId },
    select: { isOrphan: true, internalLinksCount: true },
  });
}

async function getOutgoingLinkCount(fromPageId: string): Promise<number> {
  return prisma.seoInternalLink.count({
    where: { fromPageId, isSuggested: false },
  });
}

async function mapLinkToRecommendation(
  link: {
    id: string;
    fromPageId: string;
    toPageId: string;
    anchorText: string | null;
    url: string;
    isSuggested: boolean;
  },
  pageMap: Map<string, PageRecord>
): Promise<InternalLinkRecommendation | null> {
  const source = pageMap.get(link.fromPageId);
  const target = pageMap.get(link.toPageId);
  if (!source || !target) return null;

  const targetSeo = await getSeoPageMeta(target.type, target.id);
  const targetIsOrphan =
    targetSeo?.isOrphan === true || (targetSeo?.internalLinksCount ?? 0) === 0;
  const sourceOutgoingCount = await getOutgoingLinkCount(source.id);
  const overlapWords = countWordOverlap(source.title, target.title);

  const recommendationType = deriveRecommendationType(
    source,
    target,
    targetIsOrphan,
    sourceOutgoingCount
  );

  const reason =
    recommendationType === "orphan_recovery"
      ? `Orphan recovery — boost incoming links to "${target.title}"`
      : recommendationType === "funnel"
        ? `Funnel link — connect "${source.title}" to "${target.title}"`
        : recommendationType === "weak_link_boost"
          ? `Weak link boost — "${source.title}" has fewer than 3 outgoing links`
          : overlapWords > 0
            ? `Topically related — shares keywords between pages`
            : `Suggested internal link to "${target.title}"`;

  return {
    id: link.id,
    sourcePage: toPageRef(source),
    targetPage: toPageRef(target),
    anchorText: link.anchorText || target.title,
    relevanceScore: computeRelevanceScore(
      overlapWords,
      targetIsOrphan,
      sourceOutgoingCount
    ),
    recommendationType,
    reason,
    status: link.isSuggested ? "pending" : "applied",
  };
}

async function generateAndPersistSuggestions(): Promise<number> {
  const allPages = await loadAllPages();
  const flattened = allPages.map((p) => ({
    title: p.title,
    slug: p.slug,
    url: buildPageUrl(p.slug, p.type),
  }));

  let created = 0;

  for (const source of allPages) {
    const suggestions = generateInternalLinkSuggestions(source.title, flattened);

    for (const sug of suggestions) {
      const target = allPages.find(
        (p) => buildPageUrl(p.slug, p.type) === sug.url
      );
      if (!target || target.id === source.id) continue;

      const existing = await prisma.seoInternalLink.findFirst({
        where: {
          fromPageId: source.id,
          toPageId: target.id,
          isSuggested: true,
        },
      });
      if (existing) continue;

      await prisma.seoInternalLink.create({
        data: {
          fromPageId: source.id,
          toPageId: target.id,
          url: sug.url,
          anchorText: sug.anchorText,
          isSuggested: true,
        },
      });
      created++;
    }
  }

  return created;
}

export async function getRecommendations(): Promise<{
  recommendations: InternalLinkRecommendation[];
  meta: { total: number; generated: boolean };
}> {
  let generated = false;

  let suggestedLinks = await prisma.seoInternalLink.findMany({
    where: { isSuggested: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  if (suggestedLinks.length === 0) {
    await generateAndPersistSuggestions();
    generated = true;
    suggestedLinks = await prisma.seoInternalLink.findMany({
      where: { isSuggested: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  }

  const allPages = await loadAllPages();
  const pageMap = new Map(allPages.map((p) => [p.id, p]));

  const recommendations: InternalLinkRecommendation[] = [];
  for (const link of suggestedLinks) {
    const rec = await mapLinkToRecommendation(link, pageMap);
    if (rec) recommendations.push(rec);
  }

  recommendations.sort((a, b) => b.relevanceScore - a.relevanceScore);

  return {
    recommendations,
    meta: { total: recommendations.length, generated },
  };
}

async function injectLinkIntoPage(
  pageId: string,
  url: string,
  anchorText: string
): Promise<void> {
  const payload = await getPageSectionsPayload(pageId);
  if (!payload) throw new ApplyLinkError("Source page not found", 404);

  const sections = payload.sections as SectionPayload[];
  const targetSection = sections.find(
    (s) =>
      (s.type === "content" || s.type === "about") &&
      !(typeof s.content.internalLinkUrl === "string" && s.content.internalLinkUrl.trim())
  );

  if (!targetSection) {
    const hasLink = sections.some(
      (s) =>
        typeof s.content.internalLinkUrl === "string" &&
        s.content.internalLinkUrl.includes(url)
    );
    if (hasLink) {
      throw new ApplyLinkError("Link already exists on this page", 409);
    }
    throw new ApplyLinkError("No available section slot for internal link", 409);
  }

  targetSection.content = {
    ...targetSection.content,
    internalLinkText: anchorText,
    internalLinkUrl: url,
  };

  await savePageSections(pageId, sections);
}

async function injectLinkIntoPostOrProject(
  pageId: string,
  pageType: "post" | "project",
  url: string,
  anchorText: string
): Promise<void> {
  const linkHtml = `<p><a href="${url}">${anchorText}</a></p>`;

  if (pageType === "post") {
    const post = await prisma.post.findUnique({ where: { id: pageId } });
    if (!post) throw new ApplyLinkError("Source post not found", 404);
    if (post.content?.includes(url)) {
      throw new ApplyLinkError("Link already exists in post content", 409);
    }
    await prisma.post.update({
      where: { id: pageId },
      data: { content: `${post.content || ""}\n${linkHtml}` },
    });
    return;
  }

  const project = await prisma.project.findUnique({ where: { id: pageId } });
  if (!project) throw new ApplyLinkError("Source project not found", 404);
  if (project.content?.includes(url)) {
    throw new ApplyLinkError("Link already exists in project content", 409);
  }
  await prisma.project.update({
    where: { id: pageId },
    data: { content: `${project.content || ""}\n${linkHtml}` },
  });
}

function revalidateSourcePath(source: PageRecord): void {
  const path = buildPageUrl(source.slug, source.type);
  revalidatePath(path);
  if (source.type === "page" && source.slug === "home") {
    revalidatePath("/");
  }
}

export async function applyRecommendation(
  recommendationId: string
): Promise<{ success: true; jobId: string; message: string }> {
  const link = await prisma.seoInternalLink.findUnique({
    where: { id: recommendationId },
  });

  if (!link || !link.isSuggested) {
    throw new ApplyLinkError("Recommendation not found or already applied", 404);
  }

  const source = await resolvePageById(link.fromPageId);
  if (!source) throw new ApplyLinkError("Source page not found", 404);

  const anchorText = link.anchorText || link.url;
  const sourceUrl = buildPageUrl(source.slug, source.type);

  if (source.type === "page") {
    await injectLinkIntoPage(source.id, link.url, anchorText);
  } else {
    await injectLinkIntoPostOrProject(source.id, source.type, link.url, anchorText);
  }

  await prisma.seoInternalLink.update({
    where: { id: recommendationId },
    data: { isSuggested: false },
  });

  const log = await prisma.seoAutomationLog.create({
    data: {
      action: "apply_internal_link",
      pageId: source.id,
      pageType: source.type,
      url: sourceUrl,
      before: "No injected internal link",
      after: `Injected link to ${link.url} with anchor "${anchorText}"`,
      status: "success",
      triggeredBy: "user",
    },
  });

  revalidateSourcePath(source);

  return {
    success: true,
    jobId: log.id,
    message: "Internal link injected into CMS content",
  };
}
