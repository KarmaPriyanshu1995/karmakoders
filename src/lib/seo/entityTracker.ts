import { prisma } from "@/lib/prisma";
import type { DetectedEntity } from "@/lib/seo/entityDetector";

export function mergeEntityPageRefs(pagesJson: string | null | undefined, ref: string): string {
  let pages: string[] = [];
  if (pagesJson) {
    try {
      const parsed = JSON.parse(pagesJson) as unknown;
      if (Array.isArray(parsed)) pages = parsed.map(String);
    } catch {
      pages = [];
    }
  }
  if (!pages.includes(ref)) pages.push(ref);
  return JSON.stringify(pages.slice(0, 50));
}

export async function trackEntitiesOnPage(
  tenantId: string,
  pageType: string,
  pageId: string,
  detected: DetectedEntity[]
): Promise<number> {
  const ref = `${pageType}:${pageId}`;
  let updated = 0;

  for (const entity of detected) {
    const name = entity.name.trim();
    if (!name) continue;

    const existing = await prisma.seoEntity.findFirst({
      where: { tenantId, name: { equals: name, mode: "insensitive" } },
    });

    if (existing) {
      await prisma.seoEntity.update({
        where: { id: existing.id },
        data: { pagesJson: mergeEntityPageRefs(existing.pagesJson, ref) },
      });
      updated += 1;
      continue;
    }

    if (entity.confidence < 0.85) continue;

    await prisma.seoEntity.create({
      data: {
        tenantId,
        type: entity.type || "topic",
        name,
        sitewide: false,
        pagesJson: JSON.stringify([ref]),
      },
    });
    updated += 1;
  }

  return updated;
}
