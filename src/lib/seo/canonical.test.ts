import fs from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import { describe, expect, it, vi } from "vitest";
import { canonicalUrl } from "@/lib/seo/canonical";

vi.mock("next/navigation", () => ({ notFound: vi.fn(), redirect: vi.fn(), usePathname: vi.fn() }));
vi.mock("@/modules/sign/early-access/actions", () => ({ joinEarlyAccess: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/pageQueries", () => ({
  getPageBySlug: vi.fn(async (slug: string) => ({ title: slug, seoMeta: null, sections: [] })),
}));
vi.mock("@/lib/tools/queries", () => ({ getPublishedSeoLandingPage: vi.fn(async () => null) }));

type MetadataModule = {
  metadata?: Metadata;
  generateMetadata?: (props: { params: Promise<Record<string, string>> }) => Promise<Metadata>;
};

async function metadataOf(mod: MetadataModule, params: Record<string, string> = {}): Promise<Metadata> {
  if (mod.metadata) return mod.metadata;
  return mod.generateMetadata!({ params: Promise.resolve(params) });
}

describe("canonicalUrl", () => {
  it.each([
    ["/", "https://www.karmakoders.com"],
    ["/about", "https://www.karmakoders.com/about"],
    ["/about/", "https://www.karmakoders.com/about"],
    ["/contact?type=estimate", "https://www.karmakoders.com/contact"],
    ["/portfolio#top", "https://www.karmakoders.com/portfolio"],
    ["/careers/lead-ui-designer", "https://www.karmakoders.com/careers/lead-ui-designer"],
  ])("%s → %s", (input, expected) => {
    expect(canonicalUrl(input)).toBe(expected);
  });
});

describe("exactly one canonical per page (metadata API is the only source)", () => {
  it("no component renders its own <link rel=\"canonical\">", () => {
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (/\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name)) {
          const source = fs.readFileSync(full, "utf8");
          if (/rel=["{'`]*canonical/.test(source) || /\bCanonicalURL\b/.test(source)) offenders.push(full);
        }
      }
    };
    walk(path.resolve(process.cwd(), "src"));
    expect(offenders).toEqual([]);
  });

  it.each([
    ["Sign landing", () => import("@/app/tools/sign/(marketing)/page"), {}, "https://www.karmakoders.com/tools/sign"],
    [
      "template page",
      () => import("@/app/tools/sign/(marketing)/templates/[slug]/page"),
      { slug: "mutual-nda" },
      "https://www.karmakoders.com/tools/sign/templates/mutual-nda",
    ],
    ["legal page", () => import("@/app/legal/terms/page"), {}, "https://www.karmakoders.com/legal/terms"],
    // The home page module imports the whole home tree; it only returns generateCmsMetadata("home").
    [
      "CMS home",
      async () => ({ generateMetadata: async () => (await import("@/components/CmsPageView")).generateCmsMetadata("home") }),
      {},
      "https://www.karmakoders.com",
    ],
    ["CMS page", () => import("@/app/(public)/about/page"), {}, "https://www.karmakoders.com/about"],
    ["CMS [slug] page", () => import("@/app/(public)/[slug]/page"), { slug: "privacy" }, "https://www.karmakoders.com/privacy"],
    ["static page", () => import("@/app/(public)/insights/page"), {}, "https://www.karmakoders.com/insights"],
  ] as const)("%s", async (_name, load, params, expected) => {
    const metadata = await metadataOf((await load()) as MetadataModule, params);
    expect(metadata.alternates?.canonical).toBe(expected);
  });
});
