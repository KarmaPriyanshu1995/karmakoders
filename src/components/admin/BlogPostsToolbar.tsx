"use client";

import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import {
  ADMIN_POST_PAGE_SIZE_OPTIONS,
  ADMIN_POST_TYPE_FILTERS,
  adminBlogHref,
  type AdminPostListQuery,
  type AdminPostSort,
  type AdminPostStatus,
} from "@/lib/admin-posts";

export function BlogPostsToolbar({
  query,
  publishedCount,
  draftCount,
  allCount,
}: {
  query: AdminPostListQuery;
  publishedCount: number;
  draftCount: number;
  allCount: number;
}) {
  const router = useRouter();

  function go(patch: Partial<AdminPostListQuery>) {
    router.push(adminBlogHref({ ...query, page: 1, ...patch }));
  }

  return (
    <form
      key={`${query.q}-${query.status}-${query.type}-${query.sort}-${query.pageSize}`}
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        go({
          q: String(data.get("q") || "").trim(),
          status: String(data.get("status") || "all") as AdminPostStatus,
          type: String(data.get("type") || "all") as AdminPostListQuery["type"],
          sort: String(data.get("sort") || "created") as AdminPostSort,
          pageSize: Number(data.get("pageSize") || query.pageSize),
        });
      }}
      className="grid w-full grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_9rem_11rem_9rem_8rem]"
    >
      <label className="relative min-w-0">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        <input
          name="q"
          defaultValue={query.q}
          placeholder="Search title or slug"
          className="h-10 w-full rounded-xl border border-white/10 bg-[#252422] pl-9 pr-9 text-sm text-white placeholder:text-slate-500 outline-none focus:border-[#FFC300]/60"
        />
        {query.q ? (
          <button
            type="button"
            onClick={() => go({ q: "" })}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-500 hover:text-white"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </label>

      <select
        name="status"
        defaultValue={query.status}
        onChange={(e) => go({ status: e.target.value as AdminPostStatus })}
        className="h-10 w-full rounded-xl border border-white/10 bg-[#252422] px-3 text-sm text-white outline-none focus:border-[#FFC300]/60"
        aria-label="Filter by status"
      >
        <option value="all">All ({allCount})</option>
        <option value="published">Live ({publishedCount})</option>
        <option value="draft">Drafts ({draftCount})</option>
      </select>

      <select
        name="type"
        defaultValue={query.type}
        onChange={(e) => go({ type: e.target.value as AdminPostListQuery["type"] })}
        className="h-10 w-full rounded-xl border border-white/10 bg-[#252422] px-3 text-sm text-white outline-none focus:border-[#FFC300]/60"
        aria-label="Filter by type"
      >
        {ADMIN_POST_TYPE_FILTERS.map((item) => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
      </select>

      <select
        name="sort"
        defaultValue={query.sort}
        onChange={(e) => go({ sort: e.target.value as AdminPostSort })}
        className="h-10 w-full rounded-xl border border-white/10 bg-[#252422] px-3 text-sm text-white outline-none focus:border-[#FFC300]/60"
        aria-label="Sort posts"
      >
        <option value="created">Newest</option>
        <option value="views">Most viewed</option>
        <option value="title">Title A–Z</option>
      </select>

      <select
        name="pageSize"
        defaultValue={String(query.pageSize)}
        onChange={(e) => go({ pageSize: Number(e.target.value) })}
        className="h-10 w-full rounded-xl border border-white/10 bg-[#252422] px-3 text-sm text-white outline-none focus:border-[#FFC300]/60"
        aria-label="Posts per page"
      >
        {ADMIN_POST_PAGE_SIZE_OPTIONS.map((size) => (
          <option key={size} value={size}>
            {size} / page
          </option>
        ))}
      </select>
    </form>
  );
}
