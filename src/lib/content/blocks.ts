import {
  BLOCK_TYPES,
  MERMAID_WRITER_TEMPLATE,
  TOOL_EMBED_IDS,
  type BlockType,
  type ContentBlock,
  type FormatMeta,
  type PostType,
  type ToolEmbedId,
} from "@/types/content";
import { normalizePostType } from "@/lib/content/post-types";

const WORDS_PER_MINUTE = 200;

export function newBlockId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `blk_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function isBlockType(value: unknown): value is BlockType {
  return typeof value === "string" && (BLOCK_TYPES as readonly string[]).includes(value);
}

export function isToolEmbedId(value: unknown): value is ToolEmbedId {
  return typeof value === "string" && (TOOL_EMBED_IDS as readonly string[]).includes(value);
}

export function createEmptyBlock(type: BlockType): ContentBlock {
  const id = newBlockId();
  switch (type) {
    case "HEADING":
      return { id, type, text: "" };
    case "SUBHEADING":
      return { id, type, text: "" };
    case "PARAGRAPH":
      return { id, type, html: "" };
    case "PRO_TIP":
      return { id, type, title: "Pro tip", message: "" };
    case "QUOTE":
      return { id, type, text: "", author: "" };
    case "CODE":
      return { id, type, language: "ts", code: "" };
    case "TOOL_EMBED":
      return { id, type, tool: "MVP_COST_CALCULATOR" };
    case "MERMAID":
      return { id, type, chart: MERMAID_WRITER_TEMPLATE, caption: "System Architecture" };
    case "TLDR":
      return { id, type, items: ["", "", ""] };
    case "COMPARISON_MATRIX":
      return {
        id,
        type,
        columns: ["Option A", "Option B"],
        rows: [{ label: "Criterion", values: ["", ""] }],
      };
    case "STAT_BADGES":
      return {
        id,
        type,
        stats: [
          { label: "Users", value: "" },
          { label: "Speed", value: "" },
          { label: "Cost", value: "" },
        ],
      };
    case "BEFORE_AFTER":
      return { id, type, beforeLabel: "Before", afterLabel: "After", beforeText: "", afterText: "" };
    case "TAM":
      return { id, type, market: "", insight: "" };
    case "MVP_SCOPE":
      return { id, type, now: [""], later: [""] };
    case "TECH_STACK":
      return { id, type, items: [] };
    case "BUILD_BUDGET":
      return { id, type, weeks: "4 weeks", budget: "$10k–$25k" };
    case "CLIENT_HEADER":
      return { id, type, client: "", location: "", scope: "", logoUrl: "" };
    case "DEVICE_GALLERY":
      return { id, type, images: [{ url: "", alt: "" }] };
    case "TESTIMONIAL":
      return { id, type, quote: "", name: "", role: "", linkedinUrl: "" };
    case "COPY_PROMPT":
      return { id, type, title: "Prompt", prompt: "" };
    case "PROMPT_VARS":
      return { id, type, variables: [{ name: "company_name", example: "Acme" }] };
    case "USAGE_STEPS":
      return { id, type, steps: [{ title: "Step 1", body: "" }] };
    case "OUTPUT_PREVIEW":
      return { id, type, kind: "code", content: "", caption: "" };
    case "CTA":
      return { id, type, variant: "contact", heading: "", body: "", href: "/contact", label: "Start Project" };
  }
}

const CORE_BLOCKS: BlockType[] = [
  "HEADING",
  "SUBHEADING",
  "PARAGRAPH",
  "PRO_TIP",
  "QUOTE",
  "CODE",
  "MERMAID",
  "TOOL_EMBED",
  "CTA",
];

const TYPE_BLOCKS: Record<PostType, BlockType[]> = {
  blog: ["TLDR", "COMPARISON_MATRIX"],
  "case-study": ["STAT_BADGES", "BEFORE_AFTER", "MERMAID"],
  "success-story": ["CLIENT_HEADER", "STAT_BADGES", "DEVICE_GALLERY", "TESTIMONIAL"],
  "startup-idea": ["TAM", "MVP_SCOPE", "TECH_STACK", "BUILD_BUDGET"],
  prompt: ["COPY_PROMPT", "PROMPT_VARS", "USAGE_STEPS", "OUTPUT_PREVIEW"],
};

export const BLOCK_LABELS: Record<BlockType, string> = {
  HEADING: "Heading",
  SUBHEADING: "Subheading",
  PARAGRAPH: "Paragraph",
  PRO_TIP: "Pro tip",
  QUOTE: "Quote",
  CODE: "Code block",
  TOOL_EMBED: "In-line tool",
  MERMAID: "Architecture diagram",
  TLDR: "Executive TL;DR",
  COMPARISON_MATRIX: "Comparison matrix",
  STAT_BADGES: "Impact stats",
  BEFORE_AFTER: "Before vs after",
  TAM: "Market (TAM)",
  MVP_SCOPE: "MVP scope",
  TECH_STACK: "Tech stack pills",
  BUILD_BUDGET: "Build time & budget",
  CLIENT_HEADER: "Client header",
  DEVICE_GALLERY: "Device gallery",
  TESTIMONIAL: "Client testimonial",
  COPY_PROMPT: "Copy prompt",
  PROMPT_VARS: "Prompt variables",
  USAGE_STEPS: "Usage steps",
  OUTPUT_PREVIEW: "Output preview",
  CTA: "Call to action",
};

export function availableBlocksFor(type: PostType): BlockType[] {
  const extra = TYPE_BLOCKS[type] ?? [];
  return [...CORE_BLOCKS, ...extra.filter((item) => !CORE_BLOCKS.includes(item))];
}

export function starterBlocksFor(typeInput: string): ContentBlock[] {
  const type = normalizePostType(typeInput);
  if (type === "blog") {
    return [createEmptyBlock("TLDR"), createEmptyBlock("PARAGRAPH"), createEmptyBlock("TOOL_EMBED")];
  }
  if (type === "case-study") {
    return [createEmptyBlock("STAT_BADGES"), createEmptyBlock("MERMAID"), createEmptyBlock("BEFORE_AFTER")];
  }
  if (type === "success-story") {
    return [
      createEmptyBlock("CLIENT_HEADER"),
      createEmptyBlock("STAT_BADGES"),
      createEmptyBlock("DEVICE_GALLERY"),
      createEmptyBlock("TESTIMONIAL"),
    ];
  }
  if (type === "startup-idea") {
    return [
      createEmptyBlock("TAM"),
      createEmptyBlock("MVP_SCOPE"),
      createEmptyBlock("TECH_STACK"),
      createEmptyBlock("BUILD_BUDGET"),
    ];
  }
  return [
    createEmptyBlock("COPY_PROMPT"),
    createEmptyBlock("PROMPT_VARS"),
    createEmptyBlock("USAGE_STEPS"),
    createEmptyBlock("OUTPUT_PREVIEW"),
  ];
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map((item) => asString(item)) : [];
}

export function parseContentBlocks(raw: unknown): ContentBlock[] {
  if (!raw) return [];
  let value = raw;
  if (typeof raw === "string") {
    try {
      value = JSON.parse(raw);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(value)) return [];

  const blocks: ContentBlock[] = [];
  for (const item of value) {
    const rec = asRecord(item);
    if (!rec || !isBlockType(rec.type)) continue;
    const id = asString(rec.id, newBlockId());
    const parsed = coerceBlock(id, rec);
    if (parsed) blocks.push(parsed);
  }
  return blocks;
}

function coerceBlock(id: string, rec: Record<string, unknown>): ContentBlock | null {
  const type = rec.type;
  if (!isBlockType(type)) return null;

  switch (type) {
    case "HEADING":
    case "SUBHEADING":
      return { id, type, text: asString(rec.text) };
    case "PARAGRAPH":
      return { id, type, html: asString(rec.html ?? rec.paragraphText) };
    case "PRO_TIP":
      return { id, type, title: asString(rec.title ?? rec.tipTitle, "Pro tip"), message: asString(rec.message ?? rec.tipMessage) };
    case "QUOTE":
      return { id, type, text: asString(rec.text ?? rec.quoteText), author: asString(rec.author ?? rec.quoteAuthor) };
    case "CODE":
      return { id, type, language: asString(rec.language, "ts"), code: asString(rec.code) };
    case "TOOL_EMBED":
      return { id, type, tool: isToolEmbedId(rec.tool ?? rec.selectedTool) ? (rec.tool ?? rec.selectedTool) as ToolEmbedId : "MVP_COST_CALCULATOR" };
    case "MERMAID":
      return { id, type, chart: asString(rec.chart ?? rec.mermaidCode, MERMAID_WRITER_TEMPLATE), caption: asString(rec.caption, "System Architecture") };
    case "TLDR":
      return { id, type, items: asStringArray(rec.items).length ? asStringArray(rec.items) : ["", "", ""] };
    case "COMPARISON_MATRIX": {
      const columns = asStringArray(rec.columns);
      const rowsRaw = Array.isArray(rec.rows) ? rec.rows : [];
      return {
        id,
        type,
        columns: columns.length ? columns : ["Option A", "Option B"],
        rows: rowsRaw.map((row) => {
          const r = asRecord(row);
          return { label: asString(r?.label), values: asStringArray(r?.values) };
        }),
      };
    }
    case "STAT_BADGES": {
      const statsRaw = Array.isArray(rec.stats) ? rec.stats : [];
      return {
        id,
        type,
        stats: statsRaw.map((stat) => {
          const s = asRecord(stat);
          return { label: asString(s?.label), value: asString(s?.value) };
        }),
      };
    }
    case "BEFORE_AFTER":
      return {
        id,
        type,
        beforeLabel: asString(rec.beforeLabel, "Before"),
        afterLabel: asString(rec.afterLabel, "After"),
        beforeText: asString(rec.beforeText),
        afterText: asString(rec.afterText),
      };
    case "TAM":
      return { id, type, market: asString(rec.market), insight: asString(rec.insight) };
    case "MVP_SCOPE":
      return { id, type, now: asStringArray(rec.now), later: asStringArray(rec.later) };
    case "TECH_STACK":
      return { id, type, items: asStringArray(rec.items) };
    case "BUILD_BUDGET":
      return { id, type, weeks: asString(rec.weeks), budget: asString(rec.budget) };
    case "CLIENT_HEADER":
      return {
        id,
        type,
        client: asString(rec.client),
        location: asString(rec.location),
        scope: asString(rec.scope),
        logoUrl: asString(rec.logoUrl),
      };
    case "DEVICE_GALLERY": {
      const imagesRaw = Array.isArray(rec.images) ? rec.images : [];
      return {
        id,
        type,
        images: imagesRaw.map((img) => {
          const i = asRecord(img);
          return { url: asString(i?.url), alt: asString(i?.alt) };
        }),
      };
    }
    case "TESTIMONIAL":
      return {
        id,
        type,
        quote: asString(rec.quote),
        name: asString(rec.name),
        role: asString(rec.role),
        linkedinUrl: asString(rec.linkedinUrl),
      };
    case "COPY_PROMPT":
      return { id, type, title: asString(rec.title, "Prompt"), prompt: asString(rec.prompt) };
    case "PROMPT_VARS": {
      const variablesRaw = Array.isArray(rec.variables) ? rec.variables : [];
      return {
        id,
        type,
        variables: variablesRaw.map((variable) => {
          const v = asRecord(variable);
          return { name: asString(v?.name), example: asString(v?.example) };
        }),
      };
    }
    case "USAGE_STEPS": {
      const stepsRaw = Array.isArray(rec.steps) ? rec.steps : [];
      return {
        id,
        type,
        steps: stepsRaw.map((step) => {
          const s = asRecord(step);
          return { title: asString(s?.title), body: asString(s?.body) };
        }),
      };
    }
    case "OUTPUT_PREVIEW":
      return {
        id,
        type,
        kind: rec.kind === "image" ? "image" : "code",
        content: asString(rec.content),
        caption: asString(rec.caption),
      };
    case "CTA":
      return {
        id,
        type,
        variant: rec.variant === "cal" || rec.variant === "whatsapp" || rec.variant === "newsletter" || rec.variant === "custom" ? rec.variant : "contact",
        heading: asString(rec.heading),
        body: asString(rec.body),
        href: asString(rec.href, "/contact"),
        label: asString(rec.label, "Start Project"),
      };
  }
}

export function parseFormatMeta(raw: unknown): FormatMeta {
  if (!raw) return {};
  let value = raw;
  if (typeof raw === "string") {
    try {
      value = JSON.parse(raw);
    } catch {
      return {};
    }
  }
  const rec = asRecord(value);
  if (!rec) return {};
  return {
    calUrl: asString(rec.calUrl) || undefined,
    whatsappNumber: asString(rec.whatsappNumber) || undefined,
    newsletterHref: asString(rec.newsletterHref) || undefined,
    ctaOverrideHref: asString(rec.ctaOverrideHref) || undefined,
    ctaOverrideLabel: asString(rec.ctaOverrideLabel) || undefined,
  };
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ");
}

export function plainTextFromBlocks(blocks: ContentBlock[]): string {
  return blocks
    .map((block) => {
      switch (block.type) {
        case "HEADING":
        case "SUBHEADING":
          return block.text;
        case "PARAGRAPH":
          return stripHtml(block.html);
        case "PRO_TIP":
          return `${block.title} ${block.message}`;
        case "QUOTE":
          return `${block.text} ${block.author}`;
        case "CODE":
          return block.code;
        case "MERMAID":
          return block.caption || "";
        case "TLDR":
          return block.items.join(" ");
        case "COMPARISON_MATRIX":
          return `${block.columns.join(" ")} ${block.rows.map((row) => `${row.label} ${row.values.join(" ")}`).join(" ")}`;
        case "STAT_BADGES":
          return block.stats.map((stat) => `${stat.label} ${stat.value}`).join(" ");
        case "BEFORE_AFTER":
          return `${block.beforeText} ${block.afterText}`;
        case "TAM":
          return `${block.market} ${block.insight}`;
        case "MVP_SCOPE":
          return `${block.now.join(" ")} ${block.later.join(" ")}`;
        case "TECH_STACK":
          return block.items.join(" ");
        case "BUILD_BUDGET":
          return `${block.weeks} ${block.budget}`;
        case "CLIENT_HEADER":
          return `${block.client} ${block.location} ${block.scope}`;
        case "DEVICE_GALLERY":
          return block.images.map((img) => img.alt).join(" ");
        case "TESTIMONIAL":
          return `${block.quote} ${block.name} ${block.role}`;
        case "COPY_PROMPT":
          return `${block.title} ${block.prompt}`;
        case "PROMPT_VARS":
          return block.variables.map((variable) => `${variable.name} ${variable.example}`).join(" ");
        case "USAGE_STEPS":
          return block.steps.map((step) => `${step.title} ${step.body}`).join(" ");
        case "OUTPUT_PREVIEW":
          return `${block.caption || ""} ${block.kind === "code" ? block.content : ""}`;
        case "CTA":
          return `${block.heading} ${block.body}`;
        case "TOOL_EMBED":
          return "";
      }
    })
    .join(" ");
}

export function wordCountFromText(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function computeReadTimeMinutes(wordCount: number): number {
  return Math.max(1, Math.ceil(wordCount / WORDS_PER_MINUTE));
}

export function htmlFromBlocks(blocks: ContentBlock[]): string {
  const text = plainTextFromBlocks(blocks).trim();
  if (!text) return "";
  return `<p>${text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>`;
}

export function serializeBlocks(blocks: ContentBlock[]): ContentBlock[] {
  return parseContentBlocks(blocks);
}
