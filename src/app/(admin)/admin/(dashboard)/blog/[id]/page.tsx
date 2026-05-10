import { getPostBySlug, upsertPost } from "@/lib/actions";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ArrowLeft, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AdminBlogEditor({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const isNew = id === "new";
  const post = isNew 
    ? { title: "", slug: "", content: "", excerpt: "", image: "", category: "", author: "", published: false }
    : await prisma.post.findUnique({ where: { id: id } });

  if (!post && !isNew) {
    redirect("/admin/blog");
  }

  async function action(formData: FormData) {
    "use server";
    const data = {
      id: isNew ? undefined : id,
      title: formData.get("title") as string,
      slug: formData.get("slug") as string,
      excerpt: formData.get("excerpt") as string,
      content: formData.get("content") as string,
      image: formData.get("image") as string,
      category: formData.get("category") as string,
      author: formData.get("author") as string,
      published: formData.get("published") === "on",
    };
    await upsertPost(data);
    redirect("/admin/blog");
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/blog">
            <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h2 className="text-2xl font-bold text-white tracking-tight">
              {isNew ? "Create New Post" : "Edit Post"}
            </h2>
          </div>
        </div>
      </div>

      <form action={action} className="space-y-8">
        <div className="glass-card rounded-xl p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300 ml-1">Title</label>
              <input
                name="title"
                required
                defaultValue={post?.title}
                className="w-full h-12 bg-slate-950 border border-slate-800 rounded-xl px-4 text-white focus:border-indigo-500 outline-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300 ml-1">Slug</label>
              <input
                name="slug"
                required
                defaultValue={post?.slug}
                className="w-full h-12 bg-slate-950 border border-slate-800 rounded-xl px-4 text-white focus:border-indigo-500 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300 ml-1">Category</label>
              <input
                name="category"
                defaultValue={post?.category || ""}
                className="w-full h-12 bg-slate-950 border border-slate-800 rounded-xl px-4 text-white focus:border-indigo-500 outline-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300 ml-1">Author Name</label>
              <input
                name="author"
                defaultValue={post?.author || ""}
                className="w-full h-12 bg-slate-950 border border-slate-800 rounded-xl px-4 text-white focus:border-indigo-500 outline-none"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300 ml-1">Feature Image URL</label>
            <input
              name="image"
              defaultValue={post?.image || ""}
              placeholder="https://images.unsplash.com/..."
              className="w-full h-12 bg-slate-950 border border-slate-800 rounded-xl px-4 text-white focus:border-indigo-500 outline-none"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300 ml-1">Excerpt</label>
            <textarea
              name="excerpt"
              rows={2}
              defaultValue={post?.excerpt || ""}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white focus:border-indigo-500 outline-none resize-none"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300 ml-1">Content (Markdown supported)</label>
            <textarea
              name="content"
              required
              rows={12}
              defaultValue={post?.content}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white focus:border-indigo-500 outline-none resize-none font-mono text-sm"
            />
          </div>

          <div className="flex items-center gap-3 p-4 bg-slate-800/30 rounded-xl border border-slate-800">
            <input
              type="checkbox"
              name="published"
              id="published"
              defaultChecked={post?.published}
              className="w-5 h-5 rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-indigo-500"
            />
            <label htmlFor="published" className="text-sm font-medium text-slate-200">
              Publish this post immediately
            </label>
          </div>
        </div>

        <div className="flex justify-end gap-4">
          {!isNew && (
            <Button type="button" variant="ghost" className="text-rose-400 hover:text-rose-300 hover:bg-rose-400/10">
              <Trash2 className="w-4 h-4 mr-2" /> Delete Post
            </Button>
          )}
          <Button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 h-12 shadow-[0_0_20px_rgba(79,70,229,0.4)]">
            <Save className="w-4 h-4 mr-2" />
            Save Post
          </Button>
        </div>
      </form>
    </div>
  );
}
