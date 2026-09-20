import { deletePost, getAdminPosts } from "@/lib/actions";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Edit2, Eye, FileText, Plus } from "lucide-react";
import { DeleteConfirmButton } from "@/components/admin/DeleteConfirmButton";
import { BlogPostsToolbar } from "@/components/admin/BlogPostsToolbar";
import { revalidatePath } from "next/cache";
import { requireTenantContext } from "@/lib/tenant-context";
import { assertPermission, hasPermission, PERMISSIONS } from "@/lib/permissions";
import { POST_TYPE_LABELS, articlePath, normalizePostType } from "@/lib/content/post-types";
import { adminBlogHref } from "@/lib/admin-posts";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Blog Posts | karmakoders Admin",
};

const TYPE_TONE: Record<string, string> = {
  blog: "text-[#FFC300] bg-[#FFC300]/10",
  "case-study": "text-cyan-300 bg-cyan-400/10",
  "success-story": "text-emerald-300 bg-emerald-400/10",
  "startup-idea": "text-orange-300 bg-orange-400/10",
  prompt: "text-violet-300 bg-violet-400/10",
};

export default async function AdminBlogList({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { role, permissionOverrides } = await requireTenantContext();
  assertPermission(role, PERMISSIONS.BLOG_VIEW, permissionOverrides);
  const canCreate = hasPermission(role, PERMISSIONS.BLOG_CREATE, permissionOverrides);
  const canUpdate = hasPermission(role, PERMISSIONS.BLOG_UPDATE, permissionOverrides);
  const canDelete = hasPermission(role, PERMISSIONS.BLOG_DELETE, permissionOverrides);

  const raw = await searchParams;
  const { posts, query, matching, pageCount, counts } = await getAdminPosts(raw);
  const filtered = Boolean(query.q || query.type !== "all" || query.status !== "all");
  const from = matching === 0 ? 0 : (query.page - 1) * query.pageSize + 1;
  const to = Math.min(query.page * query.pageSize, matching);

  return (
    <div className="w-full text-left">
      <div className="grid w-full grid-cols-1 items-center gap-4 md:grid-cols-[minmax(0,1fr)_auto]">
        <div className="min-w-0 text-left">
          <h2 className="text-2xl font-bold tracking-tight text-white">Blog Posts</h2>
          <p className="mt-1 text-sm text-slate-400">
            {counts.published} live · {counts.drafts} drafts · {counts.all} total
          </p>
        </div>
        {canCreate ? (
          <Link
            href="/admin/blog/new"
            className="inline-flex h-10 items-center justify-center gap-2 justify-self-start rounded-xl bg-[#FFC300] px-4 text-sm font-bold text-[#1C1B1A] hover:bg-[#ffd84a] md:justify-self-end"
          >
            <Plus className="h-4 w-4" />
            New Post
          </Link>
        ) : null}
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-[#1C1B1A]">
        <div className="border-b border-white/10 p-4">
          <BlogPostsToolbar
            query={query}
            allCount={counts.all}
            publishedCount={counts.published}
            draftCount={counts.drafts}
          />
        </div>

        {posts.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <FileText className="mx-auto mb-3 h-8 w-8 text-slate-600" />
            <p className="font-semibold text-white">{filtered ? "No matching posts" : "No posts yet"}</p>
            <p className="mt-1 text-sm text-slate-500">
              {filtered ? "Try another search or reset filters." : "Create your first post to get started."}
            </p>
            {filtered ? (
              <Link href="/admin/blog" className="mt-4 inline-block text-sm font-semibold text-[#FFC300] hover:text-white">
                Reset filters
              </Link>
            ) : null}
          </div>
        ) : (
          <div>
            <div className="hidden border-b border-white/10 px-4 py-2.5 text-[11px] font-bold uppercase tracking-widest text-slate-500 md:grid md:grid-cols-[minmax(0,1fr)_8rem_6rem_8rem_7rem]">
              <span>Title</span>
              <span>Type</span>
              <span>Status</span>
              <span>Created</span>
              <span className="text-right">Actions</span>
            </div>

            <ul>
              {posts.map((post) => {
                const type = normalizePostType(post.type);
                return (
                  <li key={post.id} className="border-b border-white/5 last:border-b-0 hover:bg-white/[0.03]">
                    <div className="grid grid-cols-1 items-center gap-3 px-4 py-3.5 md:grid-cols-[minmax(0,1fr)_8rem_6rem_8rem_7rem]">
                      <div className="grid min-w-0 grid-cols-[2.75rem_minmax(0,1fr)] items-center gap-3">
                        {post.image ? (
                          <img src={post.image} alt="" className="h-11 w-11 rounded-lg object-cover" />
                        ) : (
                          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-white/5 text-[#FFC300]">
                            <FileText className="h-4 w-4" />
                          </div>
                        )}
                        <div className="min-w-0 text-left">
                          <p className="truncate font-semibold text-white">{post.title}</p>
                          <p className="truncate text-xs text-slate-500">
                            /{post.slug}
                            <span className="mx-1.5 text-white/20">·</span>
                            {(post.viewCount ?? 0).toLocaleString()} views
                          </p>
                        </div>
                      </div>

                      <div>
                        <span className={cn("inline-block rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider", TYPE_TONE[type])}>
                          {POST_TYPE_LABELS[type]}
                        </span>
                      </div>

                      <div>
                        {post.published ? (
                          <span className="text-sm font-medium text-emerald-400">Live</span>
                        ) : (
                          <span className="text-sm font-medium text-amber-300">Draft</span>
                        )}
                      </div>

                      <div className="text-sm text-slate-400">
                        {new Date(post.createdAt).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </div>

                      <div className="flex items-center justify-start gap-1 md:justify-end">
                        {post.published ? (
                          <Link
                            href={articlePath(post.slug)}
                            target="_blank"
                            className="rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-[#FFC300]"
                            aria-label={`View ${post.title}`}
                          >
                            <Eye className="h-4 w-4" />
                          </Link>
                        ) : null}
                        {canUpdate ? (
                          <Link
                            href={`/admin/blog/${post.id}`}
                            className="rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-[#FFC300]"
                            aria-label={`Edit ${post.title}`}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Link>
                        ) : null}
                        {canDelete ? (
                          <DeleteConfirmButton
                            iconOnly
                            confirmTitle="Delete this blog post?"
                            confirmMessage={`"${post.title}" will be permanently deleted and can't be recovered.`}
                            onDelete={async () => {
                              "use server";
                              await deletePost(post.id);
                              revalidatePath("/admin/blog");
                            }}
                            className="h-8 w-8"
                          />
                        ) : null}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {posts.length > 0 ? (
          <div className="grid grid-cols-1 items-center gap-3 border-t border-white/10 px-4 py-3 md:grid-cols-[minmax(0,1fr)_auto]">
            <p className="text-sm text-slate-500">
              Showing {from}–{to} of {matching}
              {filtered ? (
                <>
                  {" · "}
                  <Link href="/admin/blog" className="font-semibold text-[#FFC300] hover:text-white">
                    Reset
                  </Link>
                </>
              ) : null}
            </p>
            <div className="flex items-center gap-2">
              <Link
                href={adminBlogHref({ ...query, page: query.page - 1 })}
                aria-disabled={query.page <= 1}
                className={cn(
                  "inline-flex h-9 items-center gap-1 rounded-lg border border-white/10 px-3 text-sm text-slate-300 hover:border-[#FFC300]/40 hover:text-[#FFC300]",
                  query.page <= 1 && "pointer-events-none opacity-30",
                )}
              >
                <ChevronLeft className="h-4 w-4" /> Prev
              </Link>
              <span className="min-w-10 text-center text-sm text-slate-400">
                {query.page}/{pageCount}
              </span>
              <Link
                href={adminBlogHref({ ...query, page: query.page + 1 })}
                aria-disabled={query.page >= pageCount}
                className={cn(
                  "inline-flex h-9 items-center gap-1 rounded-lg border border-white/10 px-3 text-sm text-slate-300 hover:border-[#FFC300]/40 hover:text-[#FFC300]",
                  query.page >= pageCount && "pointer-events-none opacity-30",
                )}
              >
                Next <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
