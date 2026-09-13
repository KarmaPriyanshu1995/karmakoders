import { describe, expect, it } from "vitest";
import {
  computeReadTimeMinutes,
  createEmptyBlock,
  parseContentBlocks,
  plainTextFromBlocks,
  starterBlocksFor,
  wordCountFromText,
  availableBlocksFor,
  parsePostImport,
} from "@/lib/content/blocks";

describe("content blocks", () => {
  it("parses a mixed block array and ignores unknown types", () => {
    const blocks = parseContentBlocks([
      { id: "1", type: "HEADING", text: "Architecture" },
      { id: "2", type: "NOT_REAL", text: "skip" },
      { id: "3", type: "TLDR", items: ["Fast", "Cheap", "Reliable"] },
    ]);
    expect(blocks).toHaveLength(2);
    expect(blocks[0]).toMatchObject({ type: "HEADING", text: "Architecture" });
  });

  it("counts words and reading time at 200 wpm", () => {
    const text = Array.from({ length: 400 }, () => "word").join(" ");
    expect(wordCountFromText(text)).toBe(400);
    expect(computeReadTimeMinutes(400)).toBe(2);
  });

  it("extracts plain text from TL;DR and paragraphs", () => {
    const text = plainTextFromBlocks([
      { id: "a", type: "TLDR", items: ["Ship faster", "Cut cost"] },
      { id: "b", type: "PARAGRAPH", html: "<p>Hello <strong>world</strong></p>" },
    ]);
    expect(text).toContain("Ship faster");
    expect(text).toContain("Hello");
    expect(text).not.toContain("<p>");
  });

  it("creates typed starter templates", () => {
    const idea = starterBlocksFor("startup-idea");
    expect(idea.map((b) => b.type)).toEqual(["TAM", "MVP_SCOPE", "TECH_STACK", "BUILD_BUDGET"]);
    expect(createEmptyBlock("MERMAID").type).toBe("MERMAID");
  });

  it("lists choosable blocks for each post type", () => {
    const blog = availableBlocksFor("blog");
    expect(blog.length).toBeGreaterThan(0);
    expect(blog).toContain("HEADING");
    expect(blog).toContain("PARAGRAPH");
    expect(blog).toContain("TLDR");
    expect(availableBlocksFor("prompt")).toContain("COPY_PROMPT");
  });

  it("imports a full post JSON object and a fenced blocks array", () => {
    const full = parsePostImport({
      type: "blog",
      title: "Hostinger vs GoDaddy",
      slug: "hostinger-vs-godaddy",
      excerpt: "Compare renewal before you buy.",
      blocks: [
        { type: "TLDR", items: ["A", "B", "C"] },
        { type: "PARAGRAPH", html: "<p>Hello</p>" },
        { type: "NOT_REAL", text: "skip" },
      ],
    });
    expect(full.ok).toBe(true);
    if (!full.ok) return;
    expect(full.data.title).toBe("Hostinger vs GoDaddy");
    expect(full.data.blocks.map((b) => b.type)).toEqual(["TLDR", "PARAGRAPH"]);

    const fenced = parsePostImport("```json\n[{\"type\":\"HEADING\",\"text\":\"Ship\"}]\n```");
    expect(fenced.ok).toBe(true);
    if (!fenced.ok) return;
    expect(fenced.data.blocks[0]).toMatchObject({ type: "HEADING", text: "Ship" });
  });

  it("maps writer JSON aliases for matrix rows, pro tip, CTA, mermaid, and format", () => {
    const imported = parsePostImport({
      format: "blog",
      title: "Decoding Software Development Excntech",
      blocks: [
        {
          type: "COMPARISON_MATRIX",
          columns: ["Criterion", "Modular monolith", "Serverless", "Microservices"],
          rows: [
            ["Price", "Shared runtime", "Usage-based", "Multiple runtimes"],
            ["Ops", "Fewer units", "Retries still owned", "More coordination"],
          ],
        },
        { type: "PRO_TIP", text: "Name an owner before extracting a service." },
        { type: "MERMAID", caption: "Starting point", code: "graph LR\n  A --> B" },
        {
          type: "CTA",
          variant: "newsletter",
          href: "/blog",
          label: "Subscribe for updates",
          text: "Get architecture evaluations from KarmaKoders.",
        },
      ],
    });
    expect(imported.ok).toBe(true);
    if (!imported.ok) return;
    expect(imported.data.type).toBe("blog");
    const matrix = imported.data.blocks.find((b) => b.type === "COMPARISON_MATRIX");
    expect(matrix?.type).toBe("COMPARISON_MATRIX");
    if (matrix?.type === "COMPARISON_MATRIX") {
      expect(matrix.columns).toEqual(["Modular monolith", "Serverless", "Microservices"]);
      expect(matrix.rows[0]).toEqual({
        label: "Price",
        values: ["Shared runtime", "Usage-based", "Multiple runtimes"],
      });
    }
    const tip = imported.data.blocks.find((b) => b.type === "PRO_TIP");
    expect(tip).toMatchObject({ title: "Pro tip", message: "Name an owner before extracting a service." });
    const mermaid = imported.data.blocks.find((b) => b.type === "MERMAID");
    expect(mermaid).toMatchObject({ chart: "graph LR\n  A --> B", caption: "Starting point" });
    const cta = imported.data.blocks.find((b) => b.type === "CTA");
    expect(cta).toMatchObject({
      heading: "Subscribe for updates",
      body: "Get architecture evaluations from KarmaKoders.",
      href: "/blog",
      label: "Subscribe for updates",
      variant: "newsletter",
    });
  });

  it("rejects empty or invalid import JSON", () => {
    expect(parsePostImport("").ok).toBe(false);
    expect(parsePostImport("{").ok).toBe(false);
    expect(parsePostImport({ title: "Nope", blocks: [] }).ok).toBe(false);
  });
});
