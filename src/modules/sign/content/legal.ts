/** Shared facts for the /legal pages (spec §4). Drafts: require lawyer review. */

export const LEGAL_OPERATOR = {
  name: "Karmakoders Technologies",
  description: "a partnership firm registered in India",
  city: "Jaipur",
  region: "Rajasthan",
  country: "India",
  /** Placeholder until the registered address is provided. */
  address: "[REGISTERED ADDRESS - TO BE FILLED]",
  email: "support@karmakoders.com",
  responseTime: "1-2 business days",
} as const;

export const LEGAL_LAST_UPDATED = "2026-10-07";

/** Rendered as a hidden HTML comment on every legal page. */
export const LEGAL_DRAFT_COMMENT = "DRAFT - requires lawyer review before accepting live payments";

export const LEGAL_PAGES = [
  { href: "/legal/terms", label: "Terms of Service", footerLabel: "Sign Terms" },
  { href: "/legal/privacy", label: "Privacy Policy", footerLabel: "Sign Privacy" },
  { href: "/legal/refund-policy", label: "Refund Policy", footerLabel: "Sign Refund Policy" },
  { href: "/legal/esign-disclosure", label: "E-Sign Disclosure", footerLabel: "E-Sign Disclosure" },
  { href: "/legal/acceptable-use", label: "Acceptable Use Policy", footerLabel: "Acceptable Use" },
] as const;

/** Existing CMS contact page (decision: reuse, no /tools/sign/contact). */
export const CONTACT_HREF = "/contact";

/** Processors named in the privacy policy. */
export const PROCESSORS = [
  { name: "Paddle", purpose: "payments, invoicing and tax (Merchant of Record)" },
  { name: "Vercel", purpose: "website and application hosting" },
  { name: "Neon", purpose: "database hosting" },
  { name: "Cloudflare", purpose: "encrypted file storage (R2)" },
  { name: "Resend", purpose: "transactional email" },
  { name: "Upstash", purpose: "rate limiting" },
] as const;
