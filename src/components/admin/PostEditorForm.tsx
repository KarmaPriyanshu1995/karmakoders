"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Cloud, CloudOff, Loader2, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ImagePreview } from "./ImagePreview";
import { RichTextEditor } from "./RichTextEditor";
import { upsertPost } from "@/lib/actions";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useBlogAutosave } from "@/hooks/useBlogAutosave";
import { BLOG_DRAFT_VERSION, readBlogDraft, type BlogDraftSnapshot } from "@/lib/blog-draft-storage";

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

function loadDraftOrPost(postId: string | undefined, post: any, seoMetaObj: Record<string, unknown>) {
  const draft = readBlogDraft(postId);
  const hasDraft = Boolean(
    draft && (draft.title.trim() || draft.content.replace(/<[^>]*>/g, "").trim())
  );
  const src = hasDraft ? draft! : null;

  return {
    restoredFromLocal: hasDraft,
    title: src?.title ?? post?.title ?? "",
    slug: src?.slug ?? post?.slug ?? "",
    content: src?.content ?? post?.content ?? "",
    summary: src?.summary ?? post?.excerpt ?? (seoMetaObj.description as string) ?? "",
    metaTitle: src?.metaTitle ?? (seoMetaObj.title as string) ?? "",
    imageAlt: src?.imageAlt ?? (seoMetaObj.imageAlt as string) ?? "",
    focusKeyword: src?.focusKeyword ?? (seoMetaObj.focusKeyword as string) ?? "",
    noIndex: src?.noIndex ?? Boolean(seoMetaObj.noIndex),
    image: src?.image ?? post?.image ?? "",
    category: src?.category ?? post?.category ?? "",
    author: src?.author ?? post?.author ?? "",
    type: src?.type ?? post?.type ?? "blog",
    published: src?.published ?? post?.published ?? false,
  };
}

function AutosaveIndicator({ status, lastSavedAt }: { status: string; lastSavedAt: Date | null }) {
  const time = lastSavedAt
    ? lastSavedAt.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
    : null;

  if (status === "saving") {
    return (
      <span className="inline-flex items-center gap-2 text-xs text-indigo-300">
        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving draft…
      </span>
    );
  }
  if (status === "saved") {
    return (
      <span className="inline-flex items-center gap-2 text-xs text-emerald-400">
        <Cloud className="w-3.5 h-3.5" /> Saved{time ? ` · ${time}` : ""}
      </span>
    );
  }
  if (status === "local") {
    return (
      <span className="inline-flex items-center gap-2 text-xs text-amber-300">
        <Cloud className="w-3.5 h-3.5" /> Backed up on this device{time ? ` · ${time}` : ""}
      </span>
    );
  }
  if (status === "error") {
    return (
      <span className="inline-flex items-center gap-2 text-xs text-rose-400">
        <CloudOff className="w-3.5 h-3.5" /> Offline — saved locally only
      </span>
    );
  }
  return <span className="text-xs text-slate-500">Auto-save enabled</span>;
}

export function PostEditorForm({ post, isNew, id }: PostEditorFormProps) {
  const router = useRouter();
  const seoMetaObj = parseSeoMeta(post?.seoMeta) as Record<string, unknown>;
  const initial = useMemo(() => loadDraftOrPost(isNew ? undefined : id, post, seoMetaObj), [id, isNew, post, seoMetaObj]);
  const restoredToastRef = useRef(false);

  const [savedPostId, setSavedPostId] = useState(id);
  const [isSaving, setIsSaving] = useState(false);
  const [title, setTitle] = useState(initial.title);
  const [slug, setSlug] = useState(initial.slug);
  const [content, setContent] = useState(initial.content);
  const [summary, setSummary] = useState(initial.summary);
  const [metaTitle, setMetaTitle] = useState(initial.metaTitle);
  const [imageAlt, setImageAlt] = useState(initial.imageAlt);
  const [focusKeyword, setFocusKeyword] = useState(initial.focusKeyword);
  const [noIndex, setNoIndex] = useState(initial.noIndex);
  const [image, setImage] = useState(initial.image);
  const [category, setCategory] = useState(initial.category);
  const [author, setAuthor] = useState(initial.author);
  const [type, setType] = useState(initial.type);
  const [published, setPublished] = useState(initial.published);

  useEffect(() => {
    if (initial.restoredFromLocal && !restoredToastRef.current) {
      restoredToastRef.current = true;
      toast.info("Restored your unsaved draft from this device");
    }
  }, [initial.restoredFromLocal]);

  const snapshot: BlogDraftSnapshot = useMemo(
    () => ({
      version: BLOG_DRAFT_VERSION,
      savedAt: new Date().toISOString(),
      postId: savedPostId,
      title,
      slug,
      content,
      summary,
      metaTitle,
      imageAlt,
      focusKeyword,
      noIndex,
      image,
      category,
      author,
      type,
      published,
    }),
    [
      savedPostId,
      title,
      slug,
      content,
      summary,
      metaTitle,
      imageAlt,
      focusKeyword,
      noIndex,
      image,
      category,
      author,
      type,
      published,
    ]
  );

  const { status, lastSavedAt, saveToServer, clearDraft } = useBlogAutosave({
    postId: savedPostId,
    isNew: !savedPostId,
    snapshot,
    seoMetaExtras: seoMetaObj,
    onPostCreated: (newId) => {
      setSavedPostId(newId);
      router.replace(`/admin/blog/${newId}`, { scroll: false });
    },
  });

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
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
        id: savedPostId,
        title,
        slug,
        excerpt: summary,
        content,
        image,
        category,
        author,
        type,
        published,
        seoMeta,
      });
      clearDraft();
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
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-3">
        <AutosaveIndicator status={status} lastSavedAt={lastSavedAt} />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-slate-400 hover:text-white h-8"
          onClick={() => void saveToServer()}
        >
          Save draft now
        </Button>
      </div>

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
              value={type}
              onChange={(e) => setType(e.target.value)}
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
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full h-12 bg-slate-950 border border-slate-800 rounded-xl px-4 text-white focus:border-indigo-500 outline-none"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300 ml-1">Author</label>
            <input
              name="author"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              className="w-full h-12 bg-slate-950 border border-slate-800 rounded-xl px-4 text-white focus:border-indigo-500 outline-none"
            />
          </div>
        </div>

        <div className="space-y-3">
          <label className="text-sm font-medium text-slate-300 ml-1">Featured image</label>
          <ImagePreview initialUrl={post?.image} name="image" value={image} onChange={setImage} />
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
            <span className={charBadge(metaTitle.length, 50, 60)}>{metaTitle.length} / 60</span>
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
              checked={published}
              onChange={(e) => setPublished(e.target.checked)}
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
        {savedPostId && (
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
