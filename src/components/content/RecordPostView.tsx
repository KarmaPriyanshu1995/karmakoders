"use client";

import { useEffect } from "react";

export function RecordPostView({ postId }: { postId: string }) {
  useEffect(() => {
    const key = `post-view:${postId}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      // Private mode can block sessionStorage; still count the view.
    }

    void fetch("/api/content/view", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: postId }),
      keepalive: true,
    });
  }, [postId]);

  return null;
}
