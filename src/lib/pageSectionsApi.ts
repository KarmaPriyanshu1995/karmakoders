import { prisma } from "@/lib/prisma";
import { cloneDefaultSections } from "@/lib/sectionDefaults";

export interface SectionPayload {
  id: string;
  type: string;
  content: Record<string, unknown>;
  order: number;
}

export async function resolveTargetKeywords(pageSlug: string, seoMetaRaw: string | null): Promise<string[]> {
  const keywords = new Set<string>();

  if (seoMetaRaw) {
    try {
      const meta = JSON.parse(seoMetaRaw);
      if (Array.isArray(meta.keywords)) {
        meta.keywords.forEach((k: string) => keywords.add(k.toLowerCase()));
      }
      if (typeof meta.primaryKeyword === "string") keywords.add(meta.primaryKeyword.toLowerCase());
    } catch {
      // ignore malformed seoMeta
    }
  }

  const siteConfig = await prisma.siteConfig.findUnique({ where: { key: "seoMeta" } });
  if (siteConfig) {
    try {
      const global = JSON.parse(siteConfig.value);
      if (Array.isArray(global.keywords)) {
        global.keywords.forEach((k: string) => keywords.add(k.toLowerCase()));
      }
    } catch {
      // ignore
    }
  }

  pageSlug
    .replace(/-/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2)
    .forEach((w) => keywords.add(w.toLowerCase()));

  return Array.from(keywords);
}

export async function bootstrapPageSections(pageId: string, slug: string): Promise<SectionPayload[]> {
  const defaults = cloneDefaultSections(slug);
  if (defaults.length === 0) return [];

  await prisma.section.createMany({
    data: defaults.map((section) => ({
      id: section.id,
      pageId,
      type: section.type,
      content: JSON.stringify(section.content),
      order: section.order,
    })),
    skipDuplicates: true,
  });

  const sections = await prisma.section.findMany({
    where: { pageId },
    orderBy: { order: "asc" },
  });

  return sections.map((s) => ({
    id: s.id,
    type: s.type,
    content: JSON.parse(s.content),
    order: s.order,
  }));
}

export async function getPageSectionsPayload(pageId: string) {
  const page = await prisma.page.findUnique({
    where: { id: pageId },
    include: { sections: { orderBy: { order: "asc" } } },
  });

  if (!page) return null;

  let sections = page.sections;
  if (sections.length === 0) {
    const bootstrapped = await bootstrapPageSections(pageId, page.slug);
    if (bootstrapped.length > 0) {
      return {
        pageId: page.id,
        slug: page.slug,
        title: page.title,
        targetKeywords: await resolveTargetKeywords(page.slug, page.seoMeta),
        sections: bootstrapped,
      };
    }
  }

  const targetKeywords = await resolveTargetKeywords(page.slug, page.seoMeta);

  return {
    pageId: page.id,
    slug: page.slug,
    title: page.title,
    targetKeywords,
    sections: sections.map((s) => ({
      id: s.id,
      type: s.type,
      content: JSON.parse(s.content),
      order: s.order,
    })),
  };
}

export async function savePageSections(
  pageId: string,
  sections: SectionPayload[],
  sectionScores?: Record<string, number>
) {
  const page = await prisma.page.findUnique({ where: { id: pageId } });
  if (!page) return null;

  const incomingIds = sections.map((s) => s.id);
  await prisma.section.deleteMany({
    where: { pageId, id: { notIn: incomingIds } },
  });

  for (const section of sections) {
    await prisma.section.upsert({
      where: { id: section.id },
      update: {
        type: section.type,
        content: JSON.stringify(section.content),
        order: section.order,
      },
      create: {
        id: section.id,
        pageId,
        type: section.type,
        content: JSON.stringify(section.content),
        order: section.order,
      },
    });
  }

  if (sectionScores) {
    let meta: Record<string, unknown> = {};
    if (page.seoMeta) {
      try {
        meta = JSON.parse(page.seoMeta);
      } catch {
        meta = {};
      }
    }
    meta.sectionScores = sectionScores;
    await prisma.page.update({
      where: { id: pageId },
      data: { seoMeta: JSON.stringify(meta) },
    });
  }

  return page;
}
