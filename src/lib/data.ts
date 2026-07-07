import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";

export async function getPageBySlug(slug: string) {
  return unstable_cache(
    async () =>
      prisma.page.findUnique({
        where: { slug },
        include: { sections: { orderBy: { order: "asc" } } },
      }),
    [`page-${slug}`],
    { revalidate: 60, tags: [`page-${slug}`] }
  )();
}

export async function getSiteConfig(key: string) {
  return unstable_cache(
    async () => {
      const record = await prisma.siteConfig.findUnique({ where: { key } });
      return record ? JSON.parse(record.value) : null;
    },
    [`site-config-${key}`],
    { revalidate: 300, tags: [`site-config-${key}`] }
  )();
}
