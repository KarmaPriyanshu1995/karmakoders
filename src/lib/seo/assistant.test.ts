import { describe, expect, it } from "vitest";
import { answerSeoQuestion, detectAssistantIntent, type SeoAssistantSnapshot } from "./assistant";

const snapshot: SeoAssistantSnapshot = {
  scores: { overall: 62, technical: 70, content: 48, schema: 30, entity: 55, internalLink: 40 },
  audit: {
    totalPages: 12,
    missingTitles: 3,
    missingDescriptions: 4,
    missingSchema: 8,
    orphanPages: 2,
    lowContentPages: 5,
  },
  issues: [
    { type: "missing_meta_title", severity: "critical", description: "Home is missing a meta title.", url: "/" },
  ],
  clusters: [{ name: "Web Development", healthScore: 40, missing: ["Next.js Guide"] }],
  gscConnected: false,
  gscClicks: 0,
  keywords: [{ keyword: "react development services", position: 8.2 }],
  lastAutomationAt: null,
  brandName: "Karmakoders",
};

describe("SEO assistant", () => {
  it("detects intents from natural questions", () => {
    expect(detectAssistantIntent("How do I add JSON-LD schema?")).toBe("schema");
    expect(detectAssistantIntent("fix orphan pages")).toBe("links");
    expect(detectAssistantIntent("why is CTR low")).toBe("ctr");
  });

  it("answers with live snapshot numbers instead of canned marketing copy", () => {
    const schema = answerSeoQuestion("Draft Organization Schema", snapshot);
    expect(schema.intent).toBe("schema");
    expect(schema.reply).toContain("8 of 12");
    expect(schema.citations[0]).toBe("/admin/seo/schema");

    const health = answerSeoQuestion("What's wrong with the site?", snapshot);
    expect(health.reply).toContain("overall 62");
    expect(health.reply).toContain("Home is missing a meta title");

    const gsc = answerSeoQuestion("connect search console", snapshot);
    expect(gsc.reply.toLowerCase()).toContain("not connected");
    expect(gsc.reply).not.toMatch(/515/);
  });
});
