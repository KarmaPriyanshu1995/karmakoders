import { describe, expect, it, beforeEach, beforeAll } from "vitest";
import {
  BLOG_DRAFT_VERSION,
  draftStorageKey,
  moveBlogDraft,
  readBlogDraft,
  slugifyDraftTitle,
  writeBlogDraft,
} from "@/lib/blog-draft-storage";

beforeAll(() => {
  const store = new Map<string, string>();
  Object.defineProperty(globalThis, "localStorage", {
    value: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
      clear: () => store.clear(),
    },
    configurable: true,
  });
});

describe("blog-draft-storage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("writes and reads a draft snapshot", () => {
    writeBlogDraft("post-1", {
      version: BLOG_DRAFT_VERSION,
      savedAt: "2026-08-28T12:00:00.000Z",
      postId: "post-1",
      title: "Hello",
      slug: "hello",
      content: "<p>Body</p>",
      summary: "Summary",
      metaTitle: "",
      imageAlt: "",
      focusKeyword: "",
      noIndex: false,
      image: "",
      category: "Tech",
      author: "Admin",
      type: "blog",
      published: false,
    });

    const draft = readBlogDraft("post-1");
    expect(draft?.title).toBe("Hello");
    expect(draftStorageKey("post-1")).toBe("kk-blog-draft:post-1");
  });

  it("moves a new-post draft to a saved post id", () => {
    writeBlogDraft(undefined, {
      version: BLOG_DRAFT_VERSION,
      savedAt: "2026-08-28T12:00:00.000Z",
      title: "Draft",
      slug: "draft",
      content: "x",
      summary: "",
      metaTitle: "",
      imageAlt: "",
      focusKeyword: "",
      noIndex: false,
      image: "",
      category: "",
      author: "",
      type: "blog",
      published: false,
    });

    moveBlogDraft(undefined, "created-id");
    expect(readBlogDraft(undefined)).toBeNull();
    expect(readBlogDraft("created-id")?.title).toBe("Draft");
  });

  it("slugifies titles for autosave", () => {
    expect(slugifyDraftTitle("Hello World!")).toBe("hello-world");
  });
});
