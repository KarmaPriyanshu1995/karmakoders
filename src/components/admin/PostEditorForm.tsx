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

  // SEO Fields State Hooks
  const seoMetaObj = (() => {
    if (!post?.seoMeta) return {};
    try {
      return typeof post.seoMeta === "string" ? JSON.parse(post.seoMeta) : post.seoMeta;
    } catch (e) {
      return {};
    }
  })();

  const [title, setTitle] = useState(post?.title || "");
  const [slug, setSlug] = useState(post?.slug || "");
  const [metaTitle, setMetaTitle] = useState(seoMetaObj.title || "");
  const [metaDesc, setMetaDesc] = useState(seoMetaObj.description || "");
  const [imageAlt, setImageAlt] = useState(seoMetaObj.imageAlt || "");
  const [focusKeyword, setFocusKeyword] = useState(seoMetaObj.focusKeyword || "");
  const [canonicalUrl, setCanonicalUrl] = useState(seoMetaObj.canonicalUrl || "");
  const [noIndex, setNoIndex] = useState(seoMetaObj.noIndex || false);
  const [tags, setTags] = useState(seoMetaObj.tags || "");

  // Word count and reading time calculations
  const cleanText = content.replace(/<[^>]*>/g, " ");
  const wordCount = cleanText.trim().split(/\s+/).filter(Boolean).length;
  const readingTime = Math.ceil(wordCount / 200);

  // Focus Keyword Density calculation
  const escapeRegExp = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  let keywordStats = null;
  if (focusKeyword.trim()) {
    const kw = focusKeyword.toLowerCase().trim();
    const escapedKw = escapeRegExp(kw);
    const titleCount = (title.toLowerCase().match(new RegExp(escapedKw, 'g')) || []).length;
    const contentCount = (cleanText.toLowerCase().match(new RegExp(escapedKw, 'g')) || []).length;
    const density = wordCount > 0 ? ((contentCount / wordCount) * 100).toFixed(2) : "0.00";
    keywordStats = { titleCount, contentCount, density };
  }

  async function handleSubmit(formData: FormData) {
    setIsSaving(true);
    try {
      // Serialize SEO meta properties to JSON string
      const seoMeta = JSON.stringify({
        title: metaTitle,
        description: metaDesc,
        imageAlt,
        focusKeyword,
        canonicalUrl,
        noIndex,
        tags,
      });

      const data = {
        id: isNew ? undefined : id,
        title: title,
        slug: slug,
        excerpt: formData.get("excerpt") as string,
        content: content, // Use state instead of formData
        image: formData.get("image") as string,
        category: formData.get("category") as string,
        author: formData.get("author") as string,
        type: formData.get("type") as string,
        published: formData.get("published") === "on",
        seoMeta: seoMeta,
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
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full h-12 bg-slate-950 border border-slate-800 rounded-xl px-4 text-white focus:border-indigo-500 outline-none"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300 ml-1">Slug</label>
            <input
              name="slug"
              required
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
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
          <div className="flex items-center justify-between ml-1">
            <label className="text-sm font-medium text-slate-300">Content (Pro Editor)</label>
            <div className="text-xs text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
              Word Count: <span className="font-bold">{wordCount}</span> ({readingTime} min read)
            </div>
          </div>
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

      {/* Premium SEO Optimizer Section */}
      <div className="glass-card rounded-xl p-8 space-y-6 border border-slate-800/80 bg-slate-900/30 backdrop-blur-md relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
        <div className="flex items-center justify-between border-b border-slate-800/60 pb-4">
          <div>
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <span className="p-1 rounded bg-indigo-500/10 text-indigo-400">⚡</span>
              SEO Meta & Indexing Optimization
            </h3>
            <p className="text-xs text-slate-400 mt-1">Configure search engine behavior, snippets, and indexing controls</p>
          </div>
        </div>

        {/* High-Priority Section */}
        <div className="space-y-6">
          <div className="text-xs font-bold text-indigo-400 uppercase tracking-wider">High-Priority Fields (Essential for SEO)</div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Meta Title */}
            <div className="space-y-2">
              <div className="flex items-center justify-between ml-1">
                <label className="text-sm font-medium text-slate-300">Meta Title</label>
                <span className={`text-xs px-2 py-0.5 rounded-full transition-all duration-300 ${
                  metaTitle.length >= 50 && metaTitle.length <= 60 
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                    : metaTitle.length > 0 
                      ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                      : "bg-slate-800 text-slate-400 border border-transparent"
                }`}>
                  {metaTitle.length} / 60 chars {metaTitle.length >= 50 && metaTitle.length <= 60 ? "(Optimal)" : ""}
                </span>
              </div>
              <input
                name="metaTitle"
                value={metaTitle}
                onChange={(e) => setMetaTitle(e.target.value)}
                placeholder="Recommended: 50–60 characters"
                className="w-full h-12 bg-slate-950 border border-slate-800 rounded-xl px-4 text-white focus:border-indigo-500 outline-none transition-colors"
              />
            </div>

            {/* Focus / Target Keyword */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300 ml-1">Focus / Target Keyword</label>
              <input
                name="focusKeyword"
                value={focusKeyword}
                onChange={(e) => setFocusKeyword(e.target.value)}
                placeholder="e.g. Next.js SEO Tutorial"
                className="w-full h-12 bg-slate-950 border border-slate-800 rounded-xl px-4 text-white focus:border-indigo-500 outline-none transition-colors"
              />
              {/* Dynamic keyword density indicator */}
              {keywordStats && (
                <div className="flex gap-3 mt-2 text-xs ml-1 transition-all duration-300 animate-fadeIn">
                  <span className={`px-2 py-0.5 rounded-md border ${
                    keywordStats.titleCount > 0 
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                      : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                  }`}>
                    Title: {keywordStats.titleCount > 0 ? "Found" : "Missing"}
                  </span>
                  <span className={`px-2 py-0.5 rounded-md border ${
                    parseFloat(keywordStats.density) >= 0.5 && parseFloat(keywordStats.density) <= 2.5
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                      : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                  }`}>
                    Density: {keywordStats.density}% ({keywordStats.contentCount} times)
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Meta Description */}
          <div className="space-y-2">
            <div className="flex items-center justify-between ml-1">
              <label className="text-sm font-medium text-slate-300">Meta Description</label>
              <span className={`text-xs px-2 py-0.5 rounded-full transition-all duration-300 ${
                metaDesc.length >= 150 && metaDesc.length <= 160 
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                  : metaDesc.length > 0
                    ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                    : "bg-slate-800 text-slate-400 border border-transparent"
              }`}>
                {metaDesc.length} / 160 chars {metaDesc.length >= 150 && metaDesc.length <= 160 ? "(Optimal)" : ""}
              </span>
            </div>
            <textarea
              name="metaDescription"
              value={metaDesc}
              onChange={(e) => setMetaDesc(e.target.value)}
              placeholder="Recommended: 150–160 characters summary copy"
              rows={3}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white focus:border-indigo-500 outline-none transition-colors resize-none"
            />
          </div>

          {/* Image Alt Text */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300 ml-1">Featured Image Alt Text (Alternative Text)</label>
            <input
              name="imageAlt"
              value={imageAlt}
              onChange={(e) => setImageAlt(e.target.value)}
              placeholder="Describe what the featured image represents for search engine crawlers & accessibility"
              className="w-full h-12 bg-slate-950 border border-slate-800 rounded-xl px-4 text-white focus:border-indigo-500 outline-none transition-colors"
            />
          </div>
        </div>

        <div className="border-t border-slate-800/60 my-6"></div>

        {/* Medium-Priority Section */}
        <div className="space-y-6">
          <div className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Medium-Priority Fields (Structure & Indexing)</div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Canonical URL */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300 ml-1">Canonical URL</label>
              <input
                name="canonicalUrl"
                value={canonicalUrl}
                onChange={(e) => setCanonicalUrl(e.target.value)}
                placeholder="https://example.com/original-source-url"
                className="w-full h-12 bg-slate-950 border border-slate-800 rounded-xl px-4 text-white focus:border-indigo-500 outline-none transition-colors"
              />
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300 ml-1">Tags (Comma-separated)</label>
              <input
                name="tags"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="react, nextjs, marketing"
                className="w-full h-12 bg-slate-950 border border-slate-800 rounded-xl px-4 text-white focus:border-indigo-500 outline-none transition-colors"
              />
            </div>
          </div>

          {/* Index / NoIndex Toggle */}
          <div className="flex items-center justify-between p-4 bg-slate-800/30 rounded-xl border border-slate-800 hover:bg-slate-800/40 transition-colors">
            <div className="flex flex-col gap-0.5">
              <label className="text-sm font-medium text-slate-200">Search Engine Indexing</label>
              <span className="text-xs text-slate-400">By default, posts are visible. Toggle to hide from search engine queries.</span>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                name="noIndex"
                id="noIndex"
                checked={noIndex}
                onChange={(e) => setNoIndex(e.target.checked)}
                className="w-5 h-5 rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
              <label htmlFor="noIndex" className="text-sm font-medium text-slate-200 cursor-pointer select-none">
                NoIndex (Hide this post)
              </label>
            </div>
          </div>
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
