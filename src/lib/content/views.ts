import { prisma } from "@/lib/prisma";
import { requireTenantContext } from "@/lib/tenant-context";
import { POST_TYPE_LABELS, normalizePostType } from "@/lib/content/post-types";
import type { PostType } from "@/types/content";

export { isBotUserAgent } from "@/lib/content/view-bots";

function toCount(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export async function incrementPostView(postId: string, tenantId: string) {
  const updated = await prisma.$executeRaw`
    UPDATE "Post"
    SET "viewCount" = "viewCount" + 1
    WHERE id = ${postId} AND "tenantId" = ${tenantId} AND published = true
  `;
  return toCount(updated) > 0;
}

export async function getContentViewStats() {
  const { tenantId } = await requireTenantContext();
  const grouped = await prisma.$queryRaw<Array<{ type: string; views: bigint | number; posts: bigint | number }>>`
    SELECT type, COALESCE(SUM("viewCount"), 0) AS views, COUNT(*)::int AS posts
    FROM "Post"
    WHERE "tenantId" = ${tenantId}
    GROUP BY type
  `;

  const byType = (Object.keys(POST_TYPE_LABELS) as PostType[]).map((type) => {
    const rows = grouped.filter((item) => normalizePostType(item.type) === type);
    return {
      type,
      label: POST_TYPE_LABELS[type],
      views: rows.reduce((sum, item) => sum + toCount(item.views), 0),
      posts: rows.reduce((sum, item) => sum + toCount(item.posts), 0),
    };
  });

  return {
    contentViews: byType.reduce((sum, item) => sum + item.views, 0),
    byType,
  };
}
