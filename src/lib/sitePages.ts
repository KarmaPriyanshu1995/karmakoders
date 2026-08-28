export interface SitePageDefinition {
  slug: string;
  title: string;
  defaultMeta?: { title: string; description: string };
}

/** All public site routes that should appear in admin Pages & SEO tools. */
export const SITE_PAGES: SitePageDefinition[] = [
  {
    slug: "home",
    title: "Home",
    defaultMeta: {
      title: "karmakoders – Premium AI Business Portfolio",
      description: "We build premium, scalable, and immersive web platforms powered by advanced AI.",
    },
  },
  { slug: "portfolio", title: "Portfolio", defaultMeta: { title: "Portfolio | karmakoders", description: "Transforming visions into digital reality - our selected works and case studies." } },
  { slug: "pricing", title: "Pricing", defaultMeta: { title: "Pricing | karmakoders", description: "Explore our flexible pricing plans tailored for your digital success." } },
  { slug: "about", title: "About", defaultMeta: { title: "About Us | karmakoders", description: "Learn more about the minds behind karmakoders and our mission." } },
  { slug: "blog", title: "Blog", defaultMeta: { title: "Blog | karmakoders", description: "Insights, tutorials, and updates from the karmakoders team." } },
  { slug: "careers", title: "Careers", defaultMeta: { title: "Careers | karmakoders", description: "Join our team and help build the future of digital experiences." } },
  { slug: "contact", title: "Contact", defaultMeta: { title: "Contact | karmakoders", description: "Get in touch with karmakoders for your next project." } },
  {
    slug: "free-tools",
    title: "Free Tools",
    defaultMeta: {
      title: "Free Tools | karmakoders",
      description: "Useful free tools for founders, developers, marketers and businesses.",
    },
  },
  { slug: "services", title: "Services", defaultMeta: { title: "Custom Software & AI Development Services for Startups | KarmaKoders", description: "Get elite custom software, mobile app, SaaS product, and AI agent development services from KarmaKoders. Protect your IP with NDAs from day one." } },
  { slug: "case-studies", title: "Case Studies", defaultMeta: { title: "Case Studies | karmakoders", description: "Real-world results from our client partnerships." } },
  {
    slug: "help-center",
    title: "Help Center",
    defaultMeta: {
      title: "Help Center | karmakoders",
      description: "Need help? Search our help center for tutorials, documentation, and answers to frequently asked questions about karmakoders.",
    },
  },
  {
    slug: "terms",
    title: "Terms of Service",
    defaultMeta: {
      title: "Terms of Service | karmakoders",
      description: "Read our terms of service to understand the rules, guidelines, and agreements for using the karmakoders platform and services.",
    },
  },
  {
    slug: "privacy",
    title: "Privacy Policy",
    defaultMeta: {
      title: "Privacy Policy | karmakoders",
      description: "Your privacy is important to us. Read our privacy policy to learn how karmakoders collects, uses, and protects your personal information.",
    },
  },
  {
    slug: "cookie-policy",
    title: "Cookie Policy",
    defaultMeta: {
      title: "Cookie Policy | karmakoders",
      description: "Learn about how we use cookies and tracking technologies to improve your experience on the karmakoders website.",
    },
  },
  {
    slug: "refund-policy",
    title: "Refund Policy",
    defaultMeta: {
      title: "Refund Policy | karmakoders",
      description: "Read our refund policy to understand the terms, eligibility, and procedures for requesting a refund.",
    },
  },
  {
    slug: "contact-support",
    title: "Contact Support",
    defaultMeta: {
      title: "Contact Support | karmakoders",
      description: "Get in touch with the karmakoders support team for technical assistance, troubleshooting, or billing inquiries.",
    },
  },
];

/** Legacy slugs from older seeds that should be migrated to the canonical slug. */
export const LEGACY_PAGE_SLUGS: Record<string, string> = {
  "/": "home",
  "/about": "about",
};

export function normalizePageSlug(slug: string): string {
  const trimmed = slug.trim();
  if (LEGACY_PAGE_SLUGS[trimmed]) return LEGACY_PAGE_SLUGS[trimmed];
  if (trimmed === "home") return "home";
  return trimmed.replace(/^\/+/, "").replace(/\/+$/, "") || "home";
}

export function buildPageUrl(
  slug: string,
  type: "page" | "post" | "project" = "page"
): string {
  const normalized = normalizePageSlug(slug);

  if (type === "post") return `/blog/${normalized}`;
  if (type === "project") return `/portfolio/${normalized}`;
  if (normalized === "home") return "/";

  return `/${normalized}`;
}
