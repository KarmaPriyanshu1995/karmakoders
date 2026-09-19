export const POST_TYPES = [
  "blog",
  "case-study",
  "success-story",
  "startup-idea",
  "prompt",
] as const;

export type PostType = (typeof POST_TYPES)[number];

export const TOOL_EMBED_IDS = [
  "DOMAIN_COMPARE",
  "IMAGE_COMPRESSOR",
  "MVP_COST_CALCULATOR",
] as const;

export type ToolEmbedId = (typeof TOOL_EMBED_IDS)[number];

export const BLOCK_TYPES = [
  "HEADING",
  "SUBHEADING",
  "PARAGRAPH",
  "PRO_TIP",
  "QUOTE",
  "CODE",
  "TOOL_EMBED",
  "MERMAID",
  "TLDR",
  "COMPARISON_MATRIX",
  "STAT_BADGES",
  "BEFORE_AFTER",
  "TAM",
  "MVP_SCOPE",
  "TECH_STACK",
  "BUILD_BUDGET",
  "CLIENT_HEADER",
  "DEVICE_GALLERY",
  "TESTIMONIAL",
  "COPY_PROMPT",
  "PROMPT_VARS",
  "USAGE_STEPS",
  "OUTPUT_PREVIEW",
  "CTA",
] as const;

export type BlockType = (typeof BLOCK_TYPES)[number];

export type CtaVariant = "newsletter" | "cal" | "whatsapp" | "contact" | "custom";

export interface HeadingBlock {
  id: string;
  type: "HEADING";
  text: string;
}

export interface SubheadingBlock {
  id: string;
  type: "SUBHEADING";
  text: string;
}

export interface ParagraphBlock {
  id: string;
  type: "PARAGRAPH";
  html: string;
}

export interface ProTipBlock {
  id: string;
  type: "PRO_TIP";
  title: string;
  message: string;
}

export interface QuoteBlock {
  id: string;
  type: "QUOTE";
  text: string;
  author: string;
}

export interface CodeBlock {
  id: string;
  type: "CODE";
  language: string;
  code: string;
}

export interface ToolEmbedBlock {
  id: string;
  type: "TOOL_EMBED";
  tool: ToolEmbedId;
}

export interface MermaidBlock {
  id: string;
  type: "MERMAID";
  chart: string;
  caption?: string;
}

export interface TldrBlock {
  id: string;
  type: "TLDR";
  items: string[];
}

export interface ComparisonMatrixBlock {
  id: string;
  type: "COMPARISON_MATRIX";
  columns: string[];
  rows: { label: string; values: string[] }[];
}

export interface StatBadgesBlock {
  id: string;
  type: "STAT_BADGES";
  stats: { label: string; value: string }[];
}

export interface BeforeAfterBlock {
  id: string;
  type: "BEFORE_AFTER";
  beforeLabel: string;
  afterLabel: string;
  beforeText: string;
  afterText: string;
}

export interface TamBlock {
  id: string;
  type: "TAM";
  market: string;
  insight: string;
}

export interface MvpScopeBlock {
  id: string;
  type: "MVP_SCOPE";
  now: string[];
  later: string[];
}

export interface TechStackBlock {
  id: string;
  type: "TECH_STACK";
  items: string[];
}

export interface BuildBudgetBlock {
  id: string;
  type: "BUILD_BUDGET";
  weeks: string;
  budget: string;
}

export interface ClientHeaderBlock {
  id: string;
  type: "CLIENT_HEADER";
  client: string;
  location: string;
  scope: string;
  logoUrl?: string;
}

export interface DeviceGalleryBlock {
  id: string;
  type: "DEVICE_GALLERY";
  images: { url: string; alt: string }[];
}

export interface TestimonialBlock {
  id: string;
  type: "TESTIMONIAL";
  quote: string;
  name: string;
  role: string;
  linkedinUrl?: string;
}

export interface CopyPromptBlock {
  id: string;
  type: "COPY_PROMPT";
  title: string;
  prompt: string;
}

export interface PromptVarsBlock {
  id: string;
  type: "PROMPT_VARS";
  variables: { name: string; example: string }[];
}

export interface UsageStepsBlock {
  id: string;
  type: "USAGE_STEPS";
  steps: { title: string; body: string }[];
}

export interface OutputPreviewBlock {
  id: string;
  type: "OUTPUT_PREVIEW";
  kind: "code" | "image";
  content: string;
  caption?: string;
}

export interface CtaBlock {
  id: string;
  type: "CTA";
  variant: CtaVariant;
  heading: string;
  body: string;
  href: string;
  label: string;
}

export type ContentBlock =
  | HeadingBlock
  | SubheadingBlock
  | ParagraphBlock
  | ProTipBlock
  | QuoteBlock
  | CodeBlock
  | ToolEmbedBlock
  | MermaidBlock
  | TldrBlock
  | ComparisonMatrixBlock
  | StatBadgesBlock
  | BeforeAfterBlock
  | TamBlock
  | MvpScopeBlock
  | TechStackBlock
  | BuildBudgetBlock
  | ClientHeaderBlock
  | DeviceGalleryBlock
  | TestimonialBlock
  | CopyPromptBlock
  | PromptVarsBlock
  | UsageStepsBlock
  | OutputPreviewBlock
  | CtaBlock;

export interface FormatMeta {
  calUrl?: string;
  whatsappNumber?: string;
  newsletterHref?: string;
  ctaOverrideHref?: string;
  ctaOverrideLabel?: string;
}

export const MERMAID_WRITER_TEMPLATE = `graph LR
  Client[Web / Mobile App] -->|HTTPS Requests| Cloudflare[Cloudflare CDN & WAF]
  Cloudflare --> NextJS[Next.js App Router]
  NextJS --> Auth[Supabase / JWT Auth]
  NextJS --> Redis[(Redis Cache)]
  NextJS --> Postgres[(PostgreSQL Primary DB)]`;
