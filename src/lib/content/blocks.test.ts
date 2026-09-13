import { describe, expect, it } from "vitest";
import {
  computeReadTimeMinutes,
  createEmptyBlock,
  parseContentBlocks,
  plainTextFromBlocks,
  starterBlocksFor,
  wordCountFromText,
  availableBlocksFor,
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
});
