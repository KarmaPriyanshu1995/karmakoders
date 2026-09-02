export const BLOG_DRAFT_VERSION = 1;

export interface BlogDraftSnapshot {
  version: typeof BLOG_DRAFT_VERSION;
  savedAt: string;
  postId?: string;
  title: string;
  slug: string;
  content: string;
  summary: string;
  metaTitle: string;
  imageAlt: string;
  focusKeyword: string;
  noIndex: boolean;
  image: string;
  category: string;
  author: string;
  type: string;
  published: boolean;
}

export function draftStorageKey(postId?: string): string {
  return `kk-blog-draft:${postId || "new"}`;
}

function hasStorage(): boolean {
  return typeof localStorage !== "undefined";
}

export function readBlogDraft(postId?: string): BlogDraftSnapshot | null {
  if (!hasStorage()) return null;
  try {
    const raw = localStorage.getItem(draftStorageKey(postId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as BlogDraftSnapshot;
    if (parsed.version !== BLOG_DRAFT_VERSION) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeBlogDraft(postId: string | undefined, snapshot: BlogDraftSnapshot): void {
  if (!hasStorage()) return;
  try {
    localStorage.setItem(draftStorageKey(postId), JSON.stringify(snapshot));
  } catch {
    // quota exceeded — ignore
  }
}

export function clearBlogDraft(postId?: string): void {
  if (!hasStorage()) return;
  localStorage.removeItem(draftStorageKey(postId));
}

export function moveBlogDraft(fromPostId: string | undefined, toPostId: string): void {
  const draft = readBlogDraft(fromPostId);
  if (!draft) return;
  writeBlogDraft(toPostId, { ...draft, postId: toPostId });
  clearBlogDraft(fromPostId);
}

export function slugifyDraftTitle(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
