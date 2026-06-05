export type FieldInputType = "text" | "textarea" | "json";

export interface FieldDef {
  key: string;
  label: string;
  input: FieldInputType;
  placeholder?: string;
}

export const SECTION_FIELD_SCHEMAS: Record<string, FieldDef[]> = {
  hero: [
    { key: "badge", label: "Badge", input: "text" },
    { key: "headline", label: "Headline", input: "text" },
    { key: "highlight", label: "Highlight Word", input: "text" },
    { key: "subheadline", label: "Subheadline", input: "textarea" },
  ],
  about: [
    { key: "tagline", label: "Tagline", input: "text" },
    { key: "heading", label: "Heading", input: "text" },
    { key: "body", label: "Body Text", input: "textarea" },
    { key: "imageAlt", label: "Image Alt Text", input: "text" },
  ],
  content: [
    { key: "tagline", label: "Tagline", input: "text" },
    { key: "heading", label: "Heading", input: "text" },
    { key: "body", label: "Body (HTML supported)", input: "textarea" },
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
  return SECTION_FIELD_SCHEMAS[type.toLowerCase()] ?? [];
}
