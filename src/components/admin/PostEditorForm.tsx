"use client";

import { useState } from "react";
import { ArrowLeft, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ImagePreview } from "./ImagePreview";
import { RichTextEditor } from "./RichTextEditor";
import { upsertPost } from "@/lib/actions";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface PostEditorFormProps {
  post: any;
  isNew: boolean;
  id?: string;
}

export function PostEditorForm({ post, isNew, id }: PostEditorFormProps) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [content, setContent] = useState(post?.content || "");
  const [image, setImage] = useState(post?.image || "");

  async function handleSubmit(formData: FormData) {
    setIsSaving(true);
    try {
      const data = {
        id: isNew ? undefined : id,
        title: formData.get("title") as string,
        slug: formData.get("slug") as string,
        excerpt: formData.get("excerpt") as string,
        content: content, // Use state instead of formData
        image: formData.get("image") as string,
        category: formData.get("category") as string,
        author: formData.get("author") as string,
        type: formData.get("type") as string,
        published: formData.get("published") === "on",
      };
      
      await upsertPost(data);
      toast.success("Post saved successfully!");
      router.push("/admin/blog");
      router.refresh();
    } catch (error) {
      toast.error("Failed to save post");
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form action={handleSubmit} className="space-y-8">
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300 ml-1">Content Type</label>
            <select
              name="type"
              defaultValue={post?.type || "blog"}
              className="w-full h-12 bg-slate-950 border border-slate-800 rounded-xl px-4 text-white focus:border-indigo-500 outline-none appearance-none"
            >
              <option value="blog">Normal Blog</option>
              <option value="case-study">Case Study / Success Story</option>
            </select>
          </div>
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

        <ImagePreview initialUrl={post?.image} name="image" />

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
          <label className="text-sm font-medium text-slate-300 ml-1">Content (Pro Editor)</label>
          <RichTextEditor 
            content={content} 
            onChange={setContent} 
            placeholder="Write your blog post content here..." 
          />
          <input type="hidden" name="content" value={content} />
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
        <Button 
          type="submit" 
          disabled={isSaving}
          className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 h-12 shadow-[0_0_20px_rgba(79,70,229,0.4)]"
        >
          {isSaving ? (
            "Saving..."
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" /> Save Post
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
