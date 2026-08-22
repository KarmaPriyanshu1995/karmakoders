import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { normalizePageSlug } from "@/lib/sitePages";
import { getContextualTenantId } from "@/lib/tenant-context";

export const getPageBySlug = cache(async (slug: string) => {
  const tenantId = await getContextualTenantId();
  const normalized = normalizePageSlug(slug);
  const candidates = normalized === "home" ? ["home", "/"] : [normalized, slug];

  const page = await prisma.page.findFirst({
    where: { tenantId, slug: { in: [...new Set(candidates)] } },
    include: { sections: { orderBy: { order: "asc" } } },
  });

  if (page && page.sections.length === 0) {
    const { bootstrapPageSections } = await import("@/lib/pageSectionsApi");
    await bootstrapPageSections(page.id, page.slug);
    return prisma.page.findFirst({
      where: { id: page.id },
      include: { sections: { orderBy: { order: "asc" } } },
    });
  }

  return page;
});
