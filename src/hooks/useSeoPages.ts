"use client";

import { useCallback, useEffect, useState } from "react";

export interface SeoIssue {
  type: string;
  severity: "critical" | "important" | "recommended";
  description: string;
  suggestion?: string;
}

export interface SeoPageData {
  id: string;
  type: string;
  url: string;
  title: string;
  metaTitle: string | null;
  metaDescription: string | null;
  overallScore: number;
  technicalScore: number;
  contentScore: number;
  entityScore: number;
  schemaScore: number;
  internalLinkScore: number;
  ctrScore: number;
  wordCount: number;
  hasFaq: boolean;
  hasSchema: boolean;
  isOrphan: boolean;
  lastAnalyzed: string | null;
  issueCount: number;
  issues: SeoIssue[];
}

interface UseSeoPagesResult {
  pageData: SeoPageData[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useSeoPages(): UseSeoPagesResult {
  const [pageData, setPageData] = useState<SeoPageData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/seo/pages");
      if (!res.ok) throw new Error("Failed to load pages");
      const data = await res.json();
      const pages: SeoPageData[] = (data.pages || []).map((p: SeoPageData & { issues?: SeoIssue[] }) => ({
        ...p,
        issues: p.issues ?? [],
      }));
      setPageData(pages);
    } catch (e) {
      console.error("[useSeoPages]", e);
      setError(e instanceof Error ? e.message : "Failed to load pages");
      setPageData([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { pageData, loading, error, refetch };
}
