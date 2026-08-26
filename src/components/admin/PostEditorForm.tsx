"use client";

import { useState } from "react";
import { Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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

function parseSeoMeta(raw: unknown) {
  if (!raw) return {};
  try {
    return typeof raw === "string" ? JSON.parse(raw) : raw;
  } catch {
    return {};
  }
}

function charBadge(length: number, min: number, max: number) {
  const optimal = length >= min && length <= max;
  return `text-xs px-2 py-0.5 rounded-full ${
    optimal
      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
      : length > 0
        ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
        : "bg-slate-800 text-slate-400 border border-transparent"
  }`;
}

export function PostEditorForm({ post, isNew, id }: PostEditorFormProps) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const seoMetaObj = parseSeoMeta(post?.seoMeta);

  const [title, setTitle] = useState(post?.title || "");
  const [slug, setSlug] = useState(post?.slug || "");
  const [content, setContent] = useState(post?.content || "");
  const [summary, setSummary] = useState(post?.excerpt || seoMetaObj.description || "");
  const [metaTitle, setMetaTitle] = useState(seoMetaObj.title || "");
  const [imageAlt, setImageAlt] = useState(seoMetaObj.imageAlt || "");
  const [focusKeyword, setFocusKeyword] = useState(seoMetaObj.focusKeyword || "");
  const [noIndex, setNoIndex] = useState(Boolean(seoMetaObj.noIndex));

  const cleanText = content.replace(/<[^>]*>/g, " ");
  const wordCount = cleanText.trim().split(/\s+/).filter(Boolean).length;
  const readingTime = Math.ceil(wordCount / 200);

  const serpTitle = (metaTitle.trim() || title.trim() || "Untitled post").slice(0, 60);
  const serpDesc = (summary.trim() || "Add a 150–160 character summary for search and social previews.").slice(0, 160);
  const serpPath = `karmakoders.com › blog › ${slug.trim() || "your-slug"}`;

  const escapeRegExp = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  let keywordStats: { titleCount: number; contentCount: number; density: string } | null = null;
  if (focusKeyword.trim()) {
    const kw = focusKeyword.toLowerCase().trim();
    const escapedKw = escapeRegExp(kw);
    const titleCount = (title.toLowerCase().match(new RegExp(escapedKw, "g")) || []).length;
    const contentCount = (cleanText.toLowerCase().match(new RegExp(escapedKw, "g")) || []).length;
    const density = wordCount > 0 ? ((contentCount / wordCount) * 100).toFixed(2) : "0.00";
    keywordStats = { titleCount, contentCount, density };
  }

  async function handleSubmit(formData: FormData) {
    setIsSaving(true);
    try {
      const seoMeta = JSON.stringify({
        title: metaTitle.trim(),
        description: summary.trim(),
        imageAlt: imageAlt.trim(),
        focusKeyword: focusKeyword.trim(),
        canonicalUrl: seoMetaObj.canonicalUrl || "",
        noIndex,
        tags: seoMetaObj.tags || "",
      });

      await upsertPost({
        id: isNew ? undefined : id,
        title,
        slug,
        excerpt: summary,
        content,
        image: formData.get("image") as string,
        category: formData.get("category") as string,
        author: formData.get("author") as string,
        type: formData.get("type") as string,
        published: formData.get("published") === "on",
        seoMeta,
      });
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
        <div className="space-y-2">
          <div className="flex items-center justify-between ml-1">
            <label className="text-sm font-medium text-slate-300">Title</label>
            <span className={charBadge((metaTitle || title).length, 50, 60)}>
              {(metaTitle || title).length} / 60 for Google
            </span>
          </div>
          <input
            name="title"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="The H1 on the page. Keep the idea in the first 60 characters."
            className="w-full h-12 bg-slate-950 border border-slate-800 rounded-xl px-4 text-white focus:border-indigo-500 outline-none"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300 ml-1">URL slug</label>
            <input
              name="slug"
              required
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="nextjs-seo-guide"
              className="w-full h-12 bg-slate-950 border border-slate-800 rounded-xl px-4 text-white focus:border-indigo-500 outline-none"
            />
            <p className="text-xs text-slate-500 ml-1">Becomes /blog/{slug.trim() || "your-slug"}</p>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300 ml-1">Focus keyword</label>
            <input
              name="focusKeyword"
              value={focusKeyword}
              onChange={(e) => setFocusKeyword(e.target.value)}
              placeholder="e.g. next.js seo"
              className="w-full h-12 bg-slate-950 border border-slate-800 rounded-xl px-4 text-white focus:border-indigo-500 outline-none"
            />
            {keywordStats && (
              <div className="flex flex-wrap gap-2 mt-1 ml-1 text-xs">
                <span
                  className={`px-2 py-0.5 rounded-md border ${
                    keywordStats.titleCount > 0
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                      : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                  }`}
                >
                  In title: {keywordStats.titleCount > 0 ? "yes" : "missing"}
                </span>
                <span
                  className={`px-2 py-0.5 rounded-md border ${
                    parseFloat(keywordStats.density) >= 0.5 && parseFloat(keywordStats.density) <= 2.5
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                      : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                  }`}
                >
                  In body: {keywordStats.density}% ({keywordStats.contentCount}×)
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300 ml-1">Type</label>
            <select
              name="type"
              defaultValue={post?.type || "blog"}
              className="w-full h-12 bg-slate-950 border border-slate-800 rounded-xl px-4 text-white focus:border-indigo-500 outline-none appearance-none"
            >
              <option value="blog">Blog</option>
              <option value="case-study">Case study</option>
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
            <label className="text-sm font-medium text-slate-300 ml-1">Author</label>
            <input
              name="author"
              defaultValue={post?.author || ""}
              className="w-full h-12 bg-slate-950 border border-slate-800 rounded-xl px-4 text-white focus:border-indigo-500 outline-none"
            />
          </div>
        </div>

        <div className="space-y-3">
          <label className="text-sm font-medium text-slate-300 ml-1">Featured image</label>
          <ImagePreview initialUrl={post?.image} name="image" />
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300 ml-1">Image alt text</label>
            <input
              name="imageAlt"
              value={imageAlt}
              onChange={(e) => setImageAlt(e.target.value)}
              placeholder="Describe the image for accessibility and image search"
              className="w-full h-12 bg-slate-950 border border-slate-800 rounded-xl px-4 text-white focus:border-indigo-500 outline-none"
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between ml-1">
            <label className="text-sm font-medium text-slate-300">Summary</label>
            <span className={charBadge(summary.length, 150, 160)}>
              {summary.length} / 160 chars {summary.length >= 150 && summary.length <= 160 ? "(optimal)" : ""}
            </span>
          </div>
          <textarea
            name="excerpt"
            rows={3}
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="One summary for blog cards, Google, and social previews. Aim for 150–160 characters."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white focus:border-indigo-500 outline-none resize-none"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between ml-1">
            <label className="text-sm font-medium text-slate-300">Content</label>
            <div className="text-xs text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
              {wordCount} words · {readingTime} min read
            </div>
          </div>
          <RichTextEditor
            content={content}
            onChange={setContent}
            placeholder="Write the article. Put the focus keyword in the first 100 words and at least one H2."
          />
          <input type="hidden" name="content" value={content} />
        </div>
      </div>

      <div className="glass-card rounded-xl p-8 space-y-6 border border-slate-800/80">
        <div>
          <h3 className="text-lg font-semibold text-white">Search appearance</h3>
          <p className="text-xs text-slate-400 mt-1">
            Title and summary above are used as-is. Override the Google title only if the H1 is too long.
          </p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-white p-4 max-w-xl">
          <p className="text-[13px] text-emerald-800 truncate">{serpPath}</p>
          <p className="text-xl text-[#1a0dab] leading-snug mt-0.5 line-clamp-2">{serpTitle}</p>
          <p className="text-sm text-[#4d5156] mt-1 line-clamp-2">{serpDesc}</p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between ml-1">
            <label className="text-sm font-medium text-slate-300">Google title override (optional)</label>
            <span className={charBadge(metaTitle.length, 50, 60)}>
              {metaTitle.length} / 60
            </span>
          </div>
          <input
            name="metaTitle"
            value={metaTitle}
            onChange={(e) => setMetaTitle(e.target.value)}
            placeholder={title.trim() ? `Defaults to: ${title.trim()}` : "Leave blank to use the post title"}
            className="w-full h-12 bg-slate-950 border border-slate-800 rounded-xl px-4 text-white focus:border-indigo-500 outline-none"
          />
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 bg-slate-800/30 rounded-xl border border-slate-800">
          <label className="flex items-center gap-3 flex-1 cursor-pointer">
            <input
              type="checkbox"
              name="published"
              id="published"
              defaultChecked={post?.published}
              className="w-5 h-5 rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-sm font-medium text-slate-200">Published</span>
          </label>
          <label className="flex items-center gap-3 flex-1 cursor-pointer">
            <input
              type="checkbox"
              name="noIndex"
              id="noIndex"
              checked={noIndex}
              onChange={(e) => setNoIndex(e.target.checked)}
              className="w-5 h-5 rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-sm font-medium text-slate-200">Hide from Google</span>
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
