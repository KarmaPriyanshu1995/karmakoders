import { describe, expect, it } from "vitest";
import { SITE_PAGES } from "./sitePages";
import { generateFaqSchema } from "./seo/schemaGenerator";

describe("SITE_PAGES metadata", () => {
  it("gives every public page a unique default title", () => {
    const titles = SITE_PAGES.map((page) => page.defaultMeta?.title).filter((title): title is string => !!title);
    expect(titles.length).toBe(SITE_PAGES.length);
    expect(new Set(titles).size).toBe(titles.length);
  });
});

describe("FAQ JSON-LD", () => {
  it("emits FAQPage entities from questions", () => {
    const schema = generateFaqSchema({
      questions: [{ question: "Do you sign NDAs?", answer: "Yes, before scoping." }],
    }) as { "@type": string; mainEntity: Array<{ name: string }> };
    expect(schema["@type"]).toBe("FAQPage");
    expect(schema.mainEntity[0].name).toBe("Do you sign NDAs?");
  });
});
