import type { Prisma } from "@prisma/client";
import { POST_TYPES, type PostType } from "@/types/content";
import { isPostType } from "@/lib/content/post-types";

export const ADMIN_POST_PAGE_SIZE_OPTIONS = [10, 20, 50] as const;
export const ADMIN_POST_DEFAULT_PAGE_SIZE = 20;

export type AdminPostStatus = "all" | "published" | "draft";
export type AdminPostSort = "created" | "views" | "title";

export type AdminPostListQuery = {
  q: string;
  type: "all" | PostType;
  status: AdminPostStatus;
  sort: AdminPostSort;
  page: number;
  pageSize: number;
};

function first(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function parsePageSize(raw: string) {
  const size = Number(raw);
  return (ADMIN_POST_PAGE_SIZE_OPTIONS as readonly number[]).includes(size)
    ? size
    : ADMIN_POST_DEFAULT_PAGE_SIZE;
}

export function parseAdminPostListQuery(
  search: Record<string, string | string[] | undefined> = {},
): AdminPostListQuery {
  const typeRaw = first(search.type);
  const statusRaw = first(search.status);
  const sortRaw = first(search.sort);
  const page = Math.max(1, Number.parseInt(first(search.page), 10) || 1);

  return {
    q: first(search.q).trim(),
    type: isPostType(typeRaw) ? typeRaw : "all",
    status: statusRaw === "published" || statusRaw === "draft" ? statusRaw : "all",
    sort: sortRaw === "views" || sortRaw === "title" ? sortRaw : "created",
    page,
    pageSize: parsePageSize(first(search.pageSize)),
  };
}

export function adminPostWhere(tenantId: string, query: AdminPostListQuery): Prisma.PostWhereInput {
  const where: Prisma.PostWhereInput = { tenantId };

  if (query.type !== "all") where.type = query.type;
  if (query.status === "published") where.published = true;
  if (query.status === "draft") where.published = false;

  if (query.q) {
    where.OR = [
      { title: { contains: query.q, mode: "insensitive" } },
      { slug: { contains: query.q, mode: "insensitive" } },
      { excerpt: { contains: query.q, mode: "insensitive" } },
      { author: { contains: query.q, mode: "insensitive" } },
    ];
  }

  return where;
}

export function adminPostOrderBy(sort: AdminPostSort): Prisma.PostOrderByWithRelationInput[] {
  if (sort === "views") return [{ viewCount: "desc" }, { createdAt: "desc" }];
  if (sort === "title") return [{ title: "asc" }];
  return [{ createdAt: "desc" }];
}

export function adminBlogHref(params: Partial<AdminPostListQuery> & { page?: number }) {
  const query = parseAdminPostListQuery({
    q: params.q,
    type: params.type,
    status: params.status,
    sort: params.sort,
    page: params.page != null ? String(params.page) : undefined,
    pageSize: params.pageSize != null ? String(params.pageSize) : undefined,
  });
  const sp = new URLSearchParams();
  if (query.q) sp.set("q", query.q);
  if (query.type !== "all") sp.set("type", query.type);
  if (query.status !== "all") sp.set("status", query.status);
  if (query.sort !== "created") sp.set("sort", query.sort);
  if (query.pageSize !== ADMIN_POST_DEFAULT_PAGE_SIZE) sp.set("pageSize", String(query.pageSize));
  if (query.page > 1) sp.set("page", String(query.page));
  const qs = sp.toString();
  return qs ? `/admin/blog?${qs}` : "/admin/blog";
}

export const ADMIN_POST_TYPE_FILTERS = [
  { value: "all" as const, label: "All types" },
  ...POST_TYPES.map((value) => ({
    value,
    label:
      value === "blog"
        ? "Blog Post"
        : value === "case-study"
          ? "Case Study"
          : value === "success-story"
            ? "Success Story"
            : value === "startup-idea"
              ? "Startup Idea"
              : "Prompt",
  })),
];
