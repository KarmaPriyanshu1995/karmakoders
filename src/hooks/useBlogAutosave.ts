"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { upsertPost } from "@/lib/actions";
import {
  type BlogDraftSnapshot,
  BLOG_DRAFT_VERSION,
  clearBlogDraft,
  moveBlogDraft,
  slugifyDraftTitle,
  writeBlogDraft,
} from "@/lib/blog-draft-storage";

export type AutosaveStatus = "idle" | "local" | "saving" | "saved" | "error";

const LOCAL_DEBOUNCE_MS = 800;
const SERVER_INTERVAL_MS = 20_000;

function snapshotSignature(snapshot: BlogDraftSnapshot): string {
  return JSON.stringify({
    title: snapshot.title,
    slug: snapshot.slug,
    content: snapshot.content,
    summary: snapshot.summary,
    metaTitle: snapshot.metaTitle,
    imageAlt: snapshot.imageAlt,
    focusKeyword: snapshot.focusKeyword,
    noIndex: snapshot.noIndex,
    image: snapshot.image,
    category: snapshot.category,
    author: snapshot.author,
    type: snapshot.type,
    published: snapshot.published,
  });
}

function hasMeaningfulContent(snapshot: BlogDraftSnapshot): boolean {
  return Boolean(snapshot.title.trim() || snapshot.content.replace(/<[^>]*>/g, "").trim());
}

export function useBlogAutosave(options: {
  postId: string | undefined;
  isNew: boolean;
  snapshot: BlogDraftSnapshot;
  seoMetaExtras?: Record<string, unknown>;
  onPostCreated: (id: string) => void;
  enabled?: boolean;
}) {
  const { postId, isNew, snapshot, seoMetaExtras, onPostCreated, enabled = true } = options;
  const [status, setStatus] = useState<AutosaveStatus>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  const postIdRef = useRef(postId);
  const isNewRef = useRef(isNew);
  const snapshotRef = useRef(snapshot);
  const lastLocalSigRef = useRef<string | null>(null);
  const lastServerSigRef = useRef<string | null>(null);
  const serverInFlightRef = useRef(false);

  postIdRef.current = postId;
  isNewRef.current = isNew;
  snapshotRef.current = snapshot;

  const persistLocal = useCallback((draft: BlogDraftSnapshot) => {
    if (!hasMeaningfulContent(draft)) return;
    writeBlogDraft(postIdRef.current, draft);
    setStatus("local");
    setLastSavedAt(new Date(draft.savedAt));
  }, []);

  const saveToServer = useCallback(async () => {
    if (!enabled || serverInFlightRef.current) return;
    const draft = snapshotRef.current;
    if (!hasMeaningfulContent(draft)) return;

    const sig = snapshotSignature(draft);
    if (sig === lastServerSigRef.current) return;

    const slug = draft.slug.trim() || slugifyDraftTitle(draft.title) || `draft-${Date.now()}`;
    if (!slug) return;

    serverInFlightRef.current = true;
    setStatus("saving");

    try {
      const seoMeta = JSON.stringify({
        title: draft.metaTitle.trim(),
        description: draft.summary.trim(),
        imageAlt: draft.imageAlt.trim(),
        focusKeyword: draft.focusKeyword.trim(),
        canonicalUrl: seoMetaExtras?.canonicalUrl || "",
        noIndex: draft.noIndex,
        tags: seoMetaExtras?.tags || "",
      });

      const saved = await upsertPost({
        id: isNewRef.current ? undefined : postIdRef.current,
        title: draft.title.trim() || "Untitled draft",
        slug,
        excerpt: draft.summary,
        content: draft.content,
        image: draft.image,
        category: draft.category,
        author: draft.author,
        type: draft.type,
        published: draft.published,
        seoMeta,
      });

      lastServerSigRef.current = sig;
      setStatus("saved");
      setLastSavedAt(new Date());

      if (isNewRef.current && saved.id) {
        moveBlogDraft(undefined, saved.id);
        onPostCreated(saved.id);
      } else {
        writeBlogDraft(saved.id, { ...draft, postId: saved.id, savedAt: new Date().toISOString() });
      }
    } catch (error) {
      console.error("[blog-autosave]", error);
      setStatus("error");
    } finally {
      serverInFlightRef.current = false;
    }
  }, [enabled, onPostCreated, seoMetaExtras]);

  // Debounced local backup
  useEffect(() => {
    if (!enabled) return;
    const sig = snapshotSignature(snapshot);
    if (sig === lastLocalSigRef.current) return;

    const timer = setTimeout(() => {
      const draft: BlogDraftSnapshot = {
        ...snapshot,
        version: BLOG_DRAFT_VERSION,
        savedAt: new Date().toISOString(),
        postId: postIdRef.current,
      };
      lastLocalSigRef.current = sig;
      persistLocal(draft);
    }, LOCAL_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [enabled, persistLocal, snapshot]);

  // Periodic server autosave
  useEffect(() => {
    if (!enabled) return;
    const timer = setInterval(() => {
      void saveToServer();
    }, SERVER_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [enabled, saveToServer]);

  // Save when tab hides or user navigates away
  useEffect(() => {
    if (!enabled) return;
    const onVisibility = () => {
      if (document.visibilityState === "hidden") void saveToServer();
    };
    const onBeforeUnload = () => {
      const draft: BlogDraftSnapshot = {
        ...snapshotRef.current,
        version: BLOG_DRAFT_VERSION,
        savedAt: new Date().toISOString(),
        postId: postIdRef.current,
      };
      persistLocal(draft);
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, [enabled, persistLocal, saveToServer]);

  const clearDraft = useCallback(() => {
    clearBlogDraft(postIdRef.current);
    lastLocalSigRef.current = null;
    lastServerSigRef.current = snapshotSignature(snapshotRef.current);
    setStatus("idle");
  }, []);

  return {
    status,
    lastSavedAt,
    saveToServer,
    clearDraft,
  };
}
