import { CUSTOM_SECTION_DEFAULT_FIELDS, SEO_CONTENT_FIELDS, SEO_IMAGE_FIELDS, SEO_LINK_FIELDS } from "@/lib/sectionLibrary";

const SEO_RICH_FIELDS: FieldDef[] = [
  ...SEO_CONTENT_FIELDS,
  ...SEO_IMAGE_FIELDS,
  ...SEO_LINK_FIELDS,
];

export type FieldInputType = "text" | "textarea" | "json" | "image";

export interface FieldDef {
  key: string;
  label: string;
  input: FieldInputType;
  placeholder?: string;
  rows?: number;
}

export const SECTION_FIELD_SCHEMAS: Record<string, FieldDef[]> = {
  hero: [
    { key: "badge", label: "Badge", input: "text" },
    { key: "headline", label: "Headline", input: "text" },
    { key: "highlight", label: "Highlight Word", input: "text" },
    { key: "subheadline", label: "Subheadline", input: "textarea" },
  ],
  about: [
    { key: "h1", label: "H1 Heading (main page title — use once per page)", input: "text", placeholder: "e.g. About KarmaKoders" },
    { key: "tagline", label: "Tagline", input: "text" },
    { key: "heading", label: "H2 Subheading", input: "text" },
    { key: "focusKeyword", label: "Focus Keyword", input: "text", placeholder: "e.g. software development agency" },
    { key: "body", label: "Body Text", input: "textarea", rows: 6 },
    { key: "secondaryBody", label: "Extra Content (SEO word count)", input: "textarea", rows: 4 },
    ...SEO_IMAGE_FIELDS.slice(0, 3),
    ...SEO_LINK_FIELDS,
  ],
  content: [
    ...SEO_RICH_FIELDS,
    { key: "faqs", label: 'FAQ Items (JSON)', input: "json" },
  ],
  pricing: [
    { key: "tagline", label: "Tagline", input: "text" },
    { key: "heading", label: "Heading", input: "text" },
    { key: "plans", label: "Plans (JSON array)", input: "json" },
  ],
  faq: [
    { key: "tagline", label: "Tagline", input: "text" },
    { key: "heading", label: "Heading", input: "text" },
    { key: "faqs", label: "FAQs (JSON array)", input: "json" },
  ],
  services: [
    { key: "tagline", label: "Tagline", input: "text" },
    { key: "heading", label: "Heading", input: "text" },
    { key: "description", label: "Description", input: "textarea" },
  ],
  contact: [
    { key: "tagline", label: "Tagline", input: "text" },
    { key: "heading", label: "Heading", input: "text" },
    { key: "description", label: "Description", input: "textarea" },
  ],
  projects: [
    { key: "tagline", label: "Tagline", input: "text" },
    { key: "heading", label: "Heading", input: "text" },
    { key: "limit", label: "Item Limit", input: "text", placeholder: "6" },
  ],
  blog: [
    { key: "tagline", label: "Tagline", input: "text" },
    { key: "heading", label: "Heading", input: "text" },
    { key: "limit", label: "Post Limit", input: "text", placeholder: "6" },
  ],
  careers: [
    { key: "tagline", label: "Tagline", input: "text" },
    { key: "heading", label: "Heading", input: "text" },
    { key: "description", label: "Description", input: "textarea" },
  ],
  casestudies: [
    { key: "tagline", label: "Tagline", input: "text" },
    { key: "heading", label: "Heading", input: "text" },
    { key: "limit", label: "Item Limit", input: "text", placeholder: "6" },
  ],
  team: [
    { key: "tagline", label: "Tagline", input: "text" },
    { key: "heading", label: "Heading", input: "text" },
  ],
  testimonials: [
    { key: "tagline", label: "Tagline", input: "text" },
    { key: "heading", label: "Heading", input: "text" },
  ],
  partners: [
    { key: "tagline", label: "Tagline", input: "text" },
    { key: "heading", label: "Heading", input: "text" },
  ],
  techstack: [
    { key: "tagline", label: "Tagline", input: "text" },
    { key: "heading", label: "Heading", input: "text" },
  ],
  feedback: [
    { key: "tagline", label: "Tagline", input: "text" },
    { key: "heading", label: "Heading", input: "text" },
  ],
  newsletter: [
    { key: "tagline", label: "Tagline", input: "text" },
    { key: "heading", label: "Heading", input: "text" },
    { key: "description", label: "Description", input: "textarea" },
  ],
};

export function getFieldsForSectionType(type: string): FieldDef[] {
  return SECTION_FIELD_SCHEMAS[type.toLowerCase()] ?? CUSTOM_SECTION_DEFAULT_FIELDS;
}
