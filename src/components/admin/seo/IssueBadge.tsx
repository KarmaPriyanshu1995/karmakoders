"use client";

import type { SeoIssue } from "@/hooks/useSeoPages";

const ISSUE_LABELS: Record<string, string> = {
  missing_meta_title: "No Title",
  missing_title: "No Title",
  short_meta_title: "Short Title",
  long_meta_title: "Long Title",
  missing_meta_desc: "No Description",
  missing_description: "No Description",
  short_meta_desc: "Short Description",
  long_meta_desc: "Long Description",
  missing_h1: "No H1",
  multiple_h1: "Multiple H1",
  thin_content: "Thin Content",
  low_word_count: "Low Word Count",
  missing_alt_text: "Missing ALT",
  missing_alt: "Missing ALT",
  missing_faq: "No FAQ",
  missing_schema: "Weak Schema",
  weak_schema: "Weak Schema",
  low_readability: "Low Readability",
  poor_heading_structure: "Poor Headings",
  orphan_page: "Orphan Page",
  duplicate_titles: "Duplicate Title",
  duplicate_descriptions: "Duplicate Desc",
};

const SEVERITY_STYLES = {
  critical: "bg-red-500/15 text-red-400 border-red-500/25",
  important: "bg-yellow-500/15 text-yellow-400 border-yellow-500/25",
  recommended: "bg-blue-500/15 text-blue-400 border-blue-500/25",
};

export function getIssueLabel(issue: SeoIssue): string {
  return ISSUE_LABELS[issue.type] ?? issue.type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

interface IssueBadgeProps {
  issue: SeoIssue;
}

export function IssueBadge({ issue }: IssueBadgeProps) {
  return (
    <span
      title={issue.description}
      className={`inline-flex text-[10px] font-bold px-2 py-0.5 rounded-full border whitespace-nowrap ${SEVERITY_STYLES[issue.severity]}`}
    >
      {getIssueLabel(issue)}
    </span>
  );
}
