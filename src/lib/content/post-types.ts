import type { FormatMeta, PostType } from "@/types/content";
import { POST_TYPES } from "@/types/content";

export const POST_TYPE_LABELS: Record<PostType, string> = {
  blog: "Blog",
  "case-study": "Case Study",
  "success-story": "Success Story",
  "startup-idea": "Startup Idea",
  prompt: "Prompt",
};

export const POST_TYPE_HUB: Record<PostType, { href: string; name: string; description: string }> = {
  blog: {
    href: "/blog",
    name: "Tech Blog",
    description: "Framework and architecture evaluations",
  },
  "case-study": {
    href: "/case-studies",
    name: "Case Studies",
    description: "Deep architectural teardowns",
  },
  "success-story": {
    href: "/success-stories",
    name: "Success Stories",
    description: "Client ROI, metrics, and proof",
  },
  "startup-idea": {
    href: "/startup-ideas",
    name: "Startup Ideas",
    description: "4-week ready-to-build MVP blueprints",
  },
  prompt: {
    href: "/prompts",
    name: "Free Prompts",
    description: "Cursor, Claude, and video prompts",
  },
};

export const DEFAULT_WHATSAPP_NUMBER = "918690071861";
export const DEFAULT_CAL_URL = "https://cal.com";
export const SITE_URL = "https://www.karmakoders.com";

export function isPostType(value: string | null | undefined): value is PostType {
  return POST_TYPES.includes(value as PostType);
}

export function normalizePostType(value: string | null | undefined): PostType {
  if (value === "case_study") return "case-study";
  if (isPostType(value)) return value;
  return "blog";
}

export function articlePath(slug: string) {
  return `/blog/${slug}`;
}

export function jsonLdArticleType(type: PostType): "BlogPosting" | "TechArticle" | "Article" {
  if (type === "case-study" || type === "startup-idea") return "TechArticle";
  if (type === "blog") return "BlogPosting";
  return "Article";
}

export function defaultCta(type: PostType, meta: FormatMeta = {}) {
  const whatsapp = (meta.whatsappNumber || DEFAULT_WHATSAPP_NUMBER).replace(/\D/g, "");
  const calUrl = meta.calUrl || process.env.NEXT_PUBLIC_CAL_URL || DEFAULT_CAL_URL;
  const newsletterHref = meta.newsletterHref || "/blog";

  const presets = {
    blog: {
      heading: "Get the 2026 Tech Stack Guide",
      body: "Join the KarmaKoders newsletter for architecture notes, stack evaluations, and build playbooks.",
      href: meta.ctaOverrideHref || newsletterHref,
      label: meta.ctaOverrideLabel || "Subscribe for updates",
    },
    "case-study": {
      heading: "Book a 15-min Architecture Review",
      body: "Walk through your system with a lead architect and leave with a scoped recommendation.",
      href: meta.ctaOverrideHref || calUrl,
      label: meta.ctaOverrideLabel || "Schedule on Cal.com",
    },
    "startup-idea": {
      heading: "Build This MVP With Us",
      body: "Share this blueprint on WhatsApp and we will return a 4-week build plan.",
      href: meta.ctaOverrideHref || `https://wa.me/${whatsapp}`,
      label: meta.ctaOverrideLabel || "Message on WhatsApp",
    },
    "success-story": {
      heading: "Have a similar project?",
      body: "Get a fixed-scope roadmap in 24 hours — timeline, stack, and investment range.",
      href: meta.ctaOverrideHref || "/contact",
      label: meta.ctaOverrideLabel || "Request a 24-hour roadmap",
    },
    prompt: {
      heading: "Need an autonomous AI agent around this model?",
      body: "We design, evaluate, and ship production agents with guardrails and observability.",
      href: meta.ctaOverrideHref || calUrl,
      label: meta.ctaOverrideLabel || "Schedule an AI call",
    },
  } as const;

  return presets[type];
}

export function usesNewsletterSignup(type: PostType, meta: FormatMeta = {}) {
  if (type !== "blog") return false;
  if (meta.ctaOverrideHref) return false;
  const href = meta.newsletterHref || "/blog";
  return !/^https?:\/\//i.test(href);
}
