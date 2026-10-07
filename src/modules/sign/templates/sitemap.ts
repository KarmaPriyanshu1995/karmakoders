import { listTemplateSlugs } from "./catalog";

/** Sign legal pages (spec 3B §4). Kept here so the sitemap has one Sign source. */
export const SIGN_LEGAL_PATHS = [
  "/legal/terms",
  "/legal/privacy",
  "/legal/refund-policy",
  "/legal/esign-disclosure",
  "/legal/acceptable-use",
] as const;

/** Indexable public Sign URLs: landing, pricing, templates, each template, legal pages. */
export function getSignSitemapPaths(): string[] {
  return [
    "/tools/sign",
    "/tools/sign/pricing",
    "/tools/sign/templates",
    ...listTemplateSlugs().map((slug) => `/tools/sign/templates/${slug}`),
    ...SIGN_LEGAL_PATHS,
  ];
}
