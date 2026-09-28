import { describe, expect, it } from "vitest";
import { assignClusterSlug, mapContentToClusters, wordCountFromText } from "./clusterMapper";
import { computeGscDelta, snapshotFromRecord } from "./gscDelta";
import { analyzeEat } from "./eatAnalyzer";
import { buildBrandGraphSchemas } from "./autoJsonLd";
import { mergeEntityPageRefs } from "./entityTracker";

describe("clusterMapper", () => {
  it("groups live pages and posts into parent/child clusters", () => {
    const clusters = mapContentToClusters([
      { id: "1", type: "post", title: "Complete React Development Guide", slug: "react-guide", content: "React Next.js frontend", wordCount: 1200, published: true },
      { id: "2", type: "post", title: "Laravel API Development", slug: "laravel-api", content: "laravel backend api", wordCount: 400, published: true },
      { id: "3", type: "post", title: "Technical SEO Audit", slug: "technical-seo", content: "seo ranking schema", wordCount: 800, published: true },
      { id: "4", type: "post", title: "Draft ignored", slug: "draft", content: "react", published: false },
    ]);

    const web = clusters.find((c) => c.slug === "web-development");
    const seo = clusters.find((c) => c.slug === "seo-services");
    expect(web?.pillar).toBe("Complete React Development Guide");
    expect(web?.children).toContain("Laravel API Development");
    expect(seo?.pillar).toContain("SEO");
    expect(assignClusterSlug({ id: "x", type: "post", title: "Flutter app", slug: "flutter", postType: "blog" })).toBe("mobile-development");
  });

  it("counts words after stripping tags", () => {
    expect(wordCountFromText("<p>Hello world</p>")).toBe(2);
  });
});

describe("gscDelta", () => {
  it("computes click/position deltas and ranking drops", () => {
    const previous = snapshotFromRecord({
      totalClicks: 100,
      totalImpressions: 1000,
      avgCtr: 0.1,
      avgPosition: 8,
      topQueriesJson: JSON.stringify([{ query: "react agency", clicks: 20, impressions: 200, ctr: 0.1, position: 5 }]),
    });
    const current = snapshotFromRecord({
      totalClicks: 140,
      totalImpressions: 1100,
      avgCtr: 0.12,
      avgPosition: 9,
      topQueriesJson: JSON.stringify([
        { query: "react agency", clicks: 10, impressions: 220, ctr: 0.04, position: 11, page: "/services" },
        { query: "react agency", clicks: 8, impressions: 80, ctr: 0.1, position: 9, page: "/blog/react" },
      ]),
    });
    const delta = computeGscDelta(previous, current, "manual");
    expect(delta.clicks).toBe(40);
    expect(delta.impressions).toBe(100);
    expect(delta.rankingDrops[0]?.query).toBe("react agency");
    expect(delta.cannibalization[0]?.pages).toHaveLength(2);
    expect(delta.lowCtr.some((row) => row.query === "react agency")).toBe(true);
  });
});

describe("eatAnalyzer", () => {
  it("scores experience and trust markers", () => {
    const eat = analyzeEat(
      "We shipped a production Next.js platform for a client and reduced wait times. Founder reviewed by our senior architect. NDA and SOC 2 controls. Contact email hours.",
      '<a href="https://example.com">source</a>'
    );
    expect(eat.score).toBeGreaterThan(40);
    expect(eat.markers.length).toBeGreaterThan(2);
  });
});

describe("autoJsonLd", () => {
  it("builds Organization, Website, Person, and Service schemas", () => {
    const schemas = buildBrandGraphSchemas({
      brandName: "Karmakoders",
      websiteUrl: "https://www.karmakoders.com",
      founderName: "Priyanshu Singh",
      services: ["Web Engineering"],
    });
    expect(schemas.map((s) => s.schemaType)).toEqual(["Organization", "Website", "Person", "Service"]);
    expect(schemas.every((s) => s.validation.valid)).toBe(true);
  });
});

describe("entityTracker", () => {
  it("appends unique page refs", () => {
    const next = mergeEntityPageRefs(JSON.stringify(["post:1"]), "page:2");
    expect(JSON.parse(next)).toEqual(["post:1", "page:2"]);
    expect(JSON.parse(mergeEntityPageRefs(next, "page:2"))).toEqual(["post:1", "page:2"]);
  });
});
