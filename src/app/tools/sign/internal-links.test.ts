import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { listTemplateSlugs } from "@/modules/sign/templates";

/**
 * Static link check: every internal href / redirect target in Sign (and legal, once it
 * exists) pages must resolve to an existing App Router page. Template-literal hrefs that
 * interpolate a template slug are expanded to every catalog slug.
 */

const APP_DIR = path.resolve(process.cwd(), "src/app");
const SCAN_DIRS = [
  ...["tools/sign", "legal"].map((d) => path.join(APP_DIR, d)),
  // Shared Sign UI renders links on these pages too (cards, footer, legal frame).
  path.resolve(process.cwd(), "src/modules/sign/ui"),
].filter((d) => fs.existsSync(d));

/** Params whose valid values are exactly the catalog slugs (others 404 via notFound/dynamicParams). */
const CATALOG_PARAMS: Record<string, true> = { "templates/[slug]": true, "new/[template]": true };

const SLUG_EXPRESSIONS = /^\$\{(?:slug|template\.slug|t\.slug|item\.slug)\}$/;

function walk(dir: string, filter: (file: string) => boolean): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full, filter);
    return filter(full) ? [full] : [];
  });
}

type Route = { segments: string[]; file: string };

function collectRoutes(): Route[] {
  return walk(APP_DIR, (f) => /[\\/]page\.(tsx|ts|jsx|js)$/.test(f)).map((file) => {
    const rel = path.relative(APP_DIR, path.dirname(file));
    const segments = rel
      .split(path.sep)
      .filter((s) => s && !(s.startsWith("(") && s.endsWith(")")) && !s.startsWith("@"));
    return { segments, file };
  });
}

function segmentRank(segment: string): number {
  if (segment.startsWith("[[...") || segment.startsWith("[...")) return 2;
  if (segment.startsWith("[")) return 1;
  return 0;
}

/** Next-style match: static beats dynamic beats catch-all, segment by segment. */
function matchRoute(routes: Route[], urlPath: string): Route | undefined {
  const parts = urlPath.split("?")[0].split("#")[0].split("/").filter(Boolean);
  const matches = routes.filter(({ segments }) => {
    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      if (seg.startsWith("[[...")) return true;
      if (seg.startsWith("[...")) return parts.length > i;
      if (i >= parts.length) return false;
      if (!seg.startsWith("[") && seg !== parts[i]) return false;
    }
    return segments.length === parts.length;
  });
  return matches.sort((a, b) => {
    const len = Math.max(a.segments.length, b.segments.length);
    for (let i = 0; i < len; i++) {
      const diff = segmentRank(a.segments[i] ?? "") - segmentRank(b.segments[i] ?? "");
      if (diff !== 0) return diff;
    }
    return 0;
  })[0];
}

const LINK_PATTERNS = [
  /href=\{?\s*"(\/[^"]*)"/g,
  /href=\{\s*`(\/[^`]*)`\s*\}/g,
  /(?:redirect|permanentRedirect|router\.(?:push|replace))\(\s*["`](\/[^"`]*)["`]/g,
];

function extractLinks(source: string): string[] {
  return LINK_PATTERNS.flatMap((re) => [...source.matchAll(re)].map((m) => m[1]));
}

function expandLink(link: string): string[] {
  const parts = link.split("/");
  if (!parts.some((p) => p.includes("${"))) return [link];
  const slugs = listTemplateSlugs();
  return slugs.map((slug) =>
    parts
      .map((p) => {
        if (!p.includes("${")) return p;
        if (!SLUG_EXPRESSIONS.test(p)) throw new Error(`Unhandled interpolation in link: ${link}`);
        return slug;
      })
      .join("/")
  );
}

describe("internal links in Sign pages", () => {
  const routes = collectRoutes();
  const files = SCAN_DIRS.flatMap((d) => walk(d, (f) => f.endsWith(".tsx")));
  const links = files.flatMap((file) =>
    extractLinks(fs.readFileSync(file, "utf8")).flatMap((link) =>
      expandLink(link).map((url) => ({ url, from: path.relative(APP_DIR, file) }))
    )
  );

  it("finds pages and links to check", () => {
    expect(files.length).toBeGreaterThan(0);
    expect(links.length).toBeGreaterThan(0);
    expect(links.map((l) => l.url)).toContain("/tools/sign/templates");
  });

  it("every internal link resolves to an existing page (no 404)", () => {
    const broken: string[] = [];
    for (const { url, from } of links) {
      const route = matchRoute(routes, url);
      if (!route) {
        broken.push(`${url} (from ${from})`);
        continue;
      }
      // A Sign URL must resolve to a Sign route, not the CMS [slug] catch-all.
      if (url.startsWith("/tools/") && route.segments[0] !== "tools") {
        broken.push(`${url} (from ${from}) only matches ${path.relative(APP_DIR, route.file)}`);
        continue;
      }
      const joined = route.segments.join("/");
      for (const [pattern] of Object.entries(CATALOG_PARAMS)) {
        if (joined.endsWith(pattern)) {
          const value = url.split("/").filter(Boolean).at(-1)!;
          if (!listTemplateSlugs().includes(value)) broken.push(`${url} (from ${from}) unknown template slug`);
        }
      }
    }
    expect(broken).toEqual([]);
  });

  it("Sign footer, legal nav and CTA targets resolve to Sign/legal/CMS pages", async () => {
    const { SIGN_FOOTER_LINKS } = await import("@/modules/sign/ui/sign-footer");
    const { LEGAL_PAGES, CONTACT_HREF } = await import("@/modules/sign/content/legal");
    const { getSignPrimaryCta, getPlanCta } = await import("@/modules/sign/launch");
    const targets = [
      ...SIGN_FOOTER_LINKS.map((l) => l.href),
      ...LEGAL_PAGES.map((p) => p.href),
      CONTACT_HREF,
      getSignPrimaryCta(true).href,
      getSignPrimaryCta(false).href,
      getPlanCta("free", true).href,
    ];
    for (const href of targets) {
      const route = matchRoute(routes, href);
      expect(route, href).toBeDefined();
      if (href.startsWith("/tools/") || href.startsWith("/legal/")) {
        expect(route!.segments[0], href).toBe(href.split("/")[1]);
      }
    }
  });

  it("matcher sanity: static routes win over dynamic ones", () => {
    expect(matchRoute(routes, "/tools/sign/new/upload")?.segments.join("/")).toBe("tools/sign/new/upload");
    expect(matchRoute(routes, "/tools/sign/new/mutual-nda")?.segments.join("/")).toBe("tools/sign/new/[template]");
    expect(matchRoute(routes, "/tools/sign/definitely-missing")?.segments[0]).not.toBe("tools");
  });
});
