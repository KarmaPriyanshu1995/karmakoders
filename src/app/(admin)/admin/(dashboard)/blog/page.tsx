import { getPosts, deletePost } from "@/lib/actions";
import Link from "next/link";
import { Edit2, FileText, Plus, Globe, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DeleteConfirmButton } from "@/components/admin/DeleteConfirmButton";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

export default async function AdminBlogList() {
  const posts = await getPosts();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Blog Posts</h2>
          <p className="text-slate-400 mt-1">Manage your dynamic blog content and articles.</p>
        </div>
        <Link href="/admin/blog/new">
          <Button className="bg-indigo-600 hover:bg-indigo-500 text-white">
            <Plus className="w-4 h-4 mr-2" />
            New Post
          </Button>
        </Link>
      </div>

      <div className="glass-card rounded-xl overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-900/50">
              <th className="p-4 font-medium text-slate-300">Title</th>
              <th className="p-4 font-medium text-slate-300">Type</th>
              <th className="p-4 font-medium text-slate-300">Status</th>
              <th className="p-4 font-medium text-slate-300">Created At</th>
              <th className="p-4 font-medium text-slate-300 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {posts.map((post) => (
              <tr key={post.id} className="hover:bg-slate-800/20 transition-colors">
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    {post.image ? (
                      <img src={post.image} className="w-10 h-10 rounded object-cover border border-slate-700" alt="" />
                    ) : (
                      <div className="w-10 h-10 rounded bg-slate-800 flex items-center justify-center text-indigo-400 border border-slate-700">
                        <FileText className="w-5 h-5" />
                      </div>
                    )}
                    <span className="font-medium text-white">{post.title}</span>
                  </div>
                </td>
                <td className="p-4">
                  <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border ${
                    post.type === 'case-study' 
                      ? 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20' 
                      : 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20'
                  }`}>
                    {post.type === 'case-study' ? 'Success Story' : 'Blog Post'}
                  </span>
                </td>
                <td className="p-4">
                  {post.published ? (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <Globe className="w-3 h-3 mr-1" /> Published
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      Draft
                    </span>
                  )}
                </td>
                <td className="p-4 text-slate-400 text-sm">
                  {new Date(post.createdAt).toLocaleDateString()}
                </td>
                <td className="p-4 text-right">
                  <div className="flex justify-end gap-2">
                    <Link href={`/blog/${post.slug}`} target="_blank">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-indigo-400">
                        <Eye className="w-4 h-4" />
                      </Button>
                    </Link>
                    <Link href={`/admin/blog/${post.id}`}>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-indigo-400">
                        <Edit2 className="w-4 h-4" />
                      </Button>
                    </Link>
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
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {posts.length === 0 && (
          <div className="p-12 text-center text-slate-500">
            No blog posts found. Create your first post!
          </div>
        )}
      </div>
    </div>
  );
}
