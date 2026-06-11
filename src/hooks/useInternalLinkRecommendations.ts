"use client";

import { useCallback, useEffect, useState } from "react";

export type RecommendationType =
  | "topical_overlap"
  | "orphan_recovery"
  | "weak_link_boost"
  | "funnel";

export interface PageRef {
  id: string;
  title: string;
  url: string;
  type: string;
}

export interface InternalLinkRecommendation {
  id: string;
  sourcePage: PageRef;
  targetPage: PageRef;
  anchorText: string;
  relevanceScore: number;
  recommendationType: RecommendationType;
  reason: string;
  status: "pending" | "applied";
}

interface RecommendationsMeta {
  total: number;
  generated: boolean;
}

interface UseInternalLinkRecommendationsResult {
  recommendations: InternalLinkRecommendation[];
  meta: RecommendationsMeta | null;
  loading: boolean;
  error: string | null;
  applyingId: string | null;
  refetch: () => Promise<void>;
  applyRecommendation: (id: string) => Promise<{ success: boolean; message?: string; error?: string }>;
}

export function useInternalLinkRecommendations(): UseInternalLinkRecommendationsResult {
  const [recommendations, setRecommendations] = useState<InternalLinkRecommendation[]>([]);
  const [meta, setMeta] = useState<RecommendationsMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [applyingId, setApplyingId] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/seo/internal-links");
      if (!res.ok) throw new Error("Failed to load recommendations");
      const data = await res.json();
      setRecommendations(data.recommendations || []);
      setMeta(data.meta || null);
    } catch (e) {
      console.error("[useInternalLinkRecommendations]", e);
      setError(e instanceof Error ? e.message : "Failed to load recommendations");
      setRecommendations([]);
      setMeta(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const applyRecommendation = useCallback(
    async (id: string): Promise<{ success: boolean; message?: string; error?: string }> => {
      setApplyingId(id);
      try {
        const res = await fetch("/api/seo/internal-links/apply", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ recommendationId: id }),
        });
        const data = await res.json();
        if (!res.ok) {
          return { success: false, error: data.error || "Failed to apply recommendation" };
        }
        setRecommendations((prev) => prev.filter((r) => r.id !== id));
        setMeta((prev) =>
          prev ? { ...prev, total: Math.max(0, prev.total - 1) } : prev
        );
        return { success: true, message: data.message };
      } catch (e) {
        console.error("[useInternalLinkRecommendations apply]", e);
        return {
          success: false,
          error: e instanceof Error ? e.message : "Failed to apply recommendation",
        };
      } finally {
        setApplyingId(null);
      }
    },
    []
  );

  useEffect(() => {
    refetch();
  }, [refetch]);

  return {
    recommendations,
    meta,
    loading,
    error,
    applyingId,
    refetch,
    applyRecommendation,
  };
}
