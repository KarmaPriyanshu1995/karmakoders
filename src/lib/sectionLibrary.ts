export const BUILTIN_SECTION_TYPES = [
  "Hero",
  "About",
  "Services",
  "Projects",
  "Testimonials",
  "Team",
  "Pricing",
  "Blog",
  "Contact",
  "FAQ",
  "Careers",
  "CaseStudies",
  "Newsletter",
  "Content",
  "Partners",
  "TechStack",
  "Feedback",
  "HeroScroll",
] as const;

export const SEO_CONTENT_FIELDS = [
  { key: "h1", label: "H1 Heading (main page title — use once per page)", input: "text" as const, placeholder: "e.g. About KarmaKoders — SaaS & AI Experts" },
  { key: "tagline", label: "Tagline / Eyebrow", input: "text" as const },
  { key: "heading", label: "H2 Subheading", input: "text" as const },
  { key: "subheading", label: "H3 Supporting Title", input: "text" as const },
  { key: "focusKeyword", label: "Focus Keyword", input: "text" as const, placeholder: "e.g. SaaS development company" },
  { key: "body", label: "Main Body (HTML supported)", input: "textarea" as const },
  { key: "secondaryBody", label: "Extra Content (adds word count for SEO)", input: "textarea" as const },
] as const;

export const SEO_IMAGE_FIELDS = [
  { key: "imageUrl", label: "Section Image", input: "image" as const },
  { key: "imageAlt", label: "Image Alt Text (required for SEO)", input: "text" as const, placeholder: "Describe the image for search engines" },
  { key: "imageTitle", label: "Image Title (optional)", input: "text" as const },
] as const;

export const SEO_LINK_FIELDS = [
  { key: "ctaText", label: "CTA Button Text", input: "text" as const, placeholder: "e.g. View Our Services" },
  { key: "ctaUrl", label: "CTA Link (internal URL)", input: "text" as const, placeholder: "/services" },
  { key: "internalLinkText", label: "Internal Link Text", input: "text" as const, placeholder: "e.g. Read our case studies" },
  { key: "internalLinkUrl", label: "Internal Link URL", input: "text" as const, placeholder: "/portfolio" },
] as const;

export const CUSTOM_SECTION_DEFAULT_FIELDS = [
  ...SEO_CONTENT_FIELDS,
  ...SEO_IMAGE_FIELDS,
  ...SEO_LINK_FIELDS,
  {
    key: "faqs",
    label: 'FAQ Items (JSON — e.g. [{"question":"...","answer":"..."}])',
    input: "json" as const,
  },
];

export function normalizeSectionType(name: string): string {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function formatSectionDisplayName(type: string): string {
  return type
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function isBuiltinSectionType(type: string): boolean {
  const normalized = normalizeSectionType(type);
  return BUILTIN_SECTION_TYPES.some((t) => normalizeSectionType(t) === normalized);
}

export function getDefaultCustomSectionContent(displayName: string): Record<string, unknown> {
  const heading = displayName.trim() || "New Section";
  return {
    h1: "",
    tagline: heading,
    heading: `Learn More About ${heading}`,
    subheading: "",
    focusKeyword: "",
    body: `<p>Add your ${heading} content here. Write at least 300 words using clear, simple sentences. Include your focus keyword naturally.</p>`,
    secondaryBody: "",
    imageUrl: "",
    imageAlt: "",
    imageTitle: "",
    ctaText: "",
    ctaUrl: "",
    internalLinkText: "",
    internalLinkUrl: "",
    faqs: [],
  };
}
