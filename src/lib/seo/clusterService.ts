import { prisma } from "@/lib/prisma";
import { extractPageHtmlFromSections } from "@/lib/seo/analyzer";
import {
  isAutoCluster,
  mapContentToClusters,
  wordCountFromText,
  type ClusterSourceItem,
  type MappedCluster,
} from "@/lib/seo/clusterMapper";

export type ClusterView = {
  id: string;
  name: string;
  slug: string;
  pillar: string;
  healthScore: number;
  authorityScore: number;
  children: string[];
  missing: string[];
  keywords: string;
};

export function toClusterView(cluster: {
  id: string;
  name: string;
  slug: string;
  pillarPageId: string | null;
  healthScore: number;
  authorityScore: number;
  childPagesJson: string | null;
  missingTopics: string | null;
  keywords: string | null;
}): ClusterView {
  let children: string[] = [];
  if (cluster.childPagesJson) {
    try {
      const parsed = JSON.parse(cluster.childPagesJson) as unknown;
      if (Array.isArray(parsed)) {
        children = parsed.map((item) => {
          if (typeof item === "string") return item;
          if (item && typeof item === "object" && "title" in item) {
            return String((item as { title: string }).title);
          }
          return "";
        }).filter(Boolean);
      }
    } catch {
      children = [];
    }
  }

  let missing: string[] = [];
  if (cluster.missingTopics) {
    try {
      const parsed = JSON.parse(cluster.missingTopics) as unknown;
      missing = Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      missing = [];
    }
  }

  return {
    id: cluster.id,
    name: cluster.name,
    slug: cluster.slug,
    pillar: cluster.pillarPageId || "",
    healthScore: cluster.healthScore,
    authorityScore: cluster.authorityScore,
    children,
    missing,
    keywords: cluster.keywords || "",
  };
}

async function loadClusterSources(tenantId: string): Promise<ClusterSourceItem[]> {
  const [pages, posts, projects] = await Promise.all([
    prisma.page.findMany({
      where: { tenantId },
      include: { sections: { orderBy: { order: "asc" } } },
    }),
    prisma.post.findMany({
      where: { tenantId },
      select: { id: true, title: true, slug: true, content: true, type: true, published: true },
    }),
    prisma.project.findMany({
      where: { tenantId },
      select: { id: true, title: true, slug: true, content: true },
    }),
  ]);

  const pageItems: ClusterSourceItem[] = pages.map((page) => {
    const html = extractPageHtmlFromSections(page.sections.map((section) => ({ content: section.content })));
    return {
      id: page.id,
      type: "page",
      title: page.title,
      slug: page.slug,
      content: html,
      wordCount: wordCountFromText(html),
      published: page.isPublished,
    };
  });

  const postItems: ClusterSourceItem[] = posts.map((post) => ({
    id: post.id,
    type: "post",
    title: post.title,
    slug: post.slug,
    content: post.content,
    postType: post.type,
    wordCount: wordCountFromText(post.content),
    published: post.published,
  }));

  const projectItems: ClusterSourceItem[] = projects.map((project) => ({
    id: project.id,
    type: "project",
    title: project.title,
    slug: project.slug,
    content: project.content,
    wordCount: wordCountFromText(project.content),
    published: true,
  }));

  return [...pageItems, ...postItems, ...projectItems];
}

function mappedToDb(tenantId: string, cluster: MappedCluster) {
  return {
    tenantId,
    name: cluster.name,
    slug: cluster.slug,
    pillarPageId: cluster.pillar,
    childPagesJson: JSON.stringify(cluster.childPages.length ? cluster.childPages : cluster.children),
    missingTopics: JSON.stringify(cluster.missing),
    keywords: cluster.keywords,
    healthScore: cluster.healthScore,
    authorityScore: cluster.authorityScore,
    topicsJson: JSON.stringify(cluster.topics),
    suggestedContent: JSON.stringify({ pillarId: cluster.pillarId, children: cluster.childPages }),
  };
}

export async function rebuildClustersFromContent(tenantId: string) {
  const items = await loadClusterSources(tenantId);
  const mapped = mapContentToClusters(items);
  const existing = await prisma.seoCluster.findMany({ where: { tenantId } });
  const mappedSlugs = new Set(mapped.map((cluster) => cluster.slug));
  const staleIds = existing
    .filter((cluster) => isAutoCluster(cluster.topicsJson) && !mappedSlugs.has(cluster.slug))
    .map((cluster) => cluster.id);

  if (staleIds.length) {
    await prisma.seoCluster.deleteMany({ where: { id: { in: staleIds } } });
  }

  for (const cluster of mapped) {
    const data = mappedToDb(tenantId, cluster);
    await prisma.seoCluster.upsert({
      where: { tenantId_slug: { tenantId, slug: cluster.slug } },
      create: data,
      update: {
        name: data.name,
        pillarPageId: data.pillarPageId,
        childPagesJson: data.childPagesJson,
        missingTopics: data.missingTopics,
        keywords: data.keywords,
        healthScore: data.healthScore,
        authorityScore: data.authorityScore,
        topicsJson: data.topicsJson,
        suggestedContent: data.suggestedContent,
      },
    });
  }

  return prisma.seoCluster.findMany({ where: { tenantId }, orderBy: { authorityScore: "desc" } });
}
