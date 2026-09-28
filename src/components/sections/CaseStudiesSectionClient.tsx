"use client";

import { Sparkles } from "lucide-react";
import { ListingCardGrid } from "@/components/content/ListingCardGrid";

export interface CaseStudyCardLike {
  id?: string;
  title: string;
  slug?: string | null;
  client?: string | null;
  category?: string | null;
  result?: string | null;
  image?: string | null;
  viewCount?: number | null;
  author?: string | null;
  createdAt?: string | Date | null;
}

interface CaseStudiesSectionClientProps {
  isCentered?: boolean;
  tagline?: string;
  heading?: string;
  cases: CaseStudyCardLike[];
  isFallback?: boolean;
  limit?: number;
  showViewAll?: boolean;
  isFirstSection?: boolean;
}

export function CaseStudiesSectionClient({
  tagline = "Case Studies",
  heading = "Real Results for Real Businesses",
  cases,
  isFallback = false,
  limit = 6,
  showViewAll = true,
  isFirstSection = false,
}: CaseStudiesSectionClientProps) {
  const numericLimit = Number(limit) || 0;
  const displayCases =
    (isFirstSection && !showViewAll) || numericLimit <= 0
      ? cases
      : cases.slice(0, numericLimit);

  return (
    <ListingCardGrid
      id="case-studies"
      ariaLabel="Case studies"
      tagline={tagline}
      heading={heading}
      isFirstSection={isFirstSection}
      items={displayCases.map((item) => ({
        id: item.id || item.slug || item.title,
        href: `/blog/${item.slug || "#"}`,
        title: item.title,
        image: item.image,
        category: item.category || item.client || "Success Story",
        date: item.createdAt,
        author: item.author,
        viewCount: item.viewCount,
        badge: isFallback ? "Concept" : null,
      }))}
      showViewAll={showViewAll}
      viewAllHref="/case-studies"
      viewAllLabel="View All Case Studies"
      emptyMessage="No case studies published yet."
      ctaLabel="Read Article"
      fallbackNotice={
        isFallback ? (
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-500/5 border border-indigo-500/20 text-slate-400 text-xs font-medium">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            Showing concept examples while live case studies load.
          </div>
        ) : null
      }
    />
  );
}
