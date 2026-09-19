export interface CrawlIssue {
  code: string;
  severity: "critical" | "warning" | "info";
  message: string;
}

export interface CrawlResult {
  url: string;
  path: string;
  status: number | null;
  ok: boolean;
  title: string | null;
  metaDescription: string | null;
  robots: string | null;
  canonical: string | null;
  issues: CrawlIssue[];
  responseMs: number;
}

const FETCH_TIMEOUT_MS = 12_000;
const MAX_CONCURRENT = 4;

function extractMeta(html: string, name: string): string | null {
  const byName = html.match(new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']*)["']`, "i"));
  if (byName?.[1]) return byName[1].trim();
  const byProp = html.match(new RegExp(`<meta[^>]+property=["']${name}["'][^>]+content=["']([^"']*)["']`, "i"));
  return byProp?.[1]?.trim() ?? null;
}

function extractTitle(html: string): string | null {
  const match = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  return match?.[1]?.trim() ?? null;
}

function extractCanonical(html: string): string | null {
  const match = html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i);
  return match?.[1]?.trim() ?? null;
}

function analyzeHtml(html: string, status: number): CrawlIssue[] {
  const issues: CrawlIssue[] = [];
  if (status >= 400) {
    issues.push({ code: "http_error", severity: "critical", message: `HTTP ${status}` });
    return issues;
  }

  const title = extractTitle(html);
  const description = extractMeta(html, "description");
  const robots = extractMeta(html, "robots");

  if (!title) issues.push({ code: "missing_title", severity: "critical", message: "Missing <title>" });
  else if (title.length < 30) issues.push({ code: "short_title", severity: "warning", message: "Title is very short" });
  else if (title.length > 60) issues.push({ code: "long_title", severity: "warning", message: "Title may truncate in Google" });

  if (!description) issues.push({ code: "missing_description", severity: "warning", message: "Missing meta description" });
  else if (description.length < 120) issues.push({ code: "short_description", severity: "info", message: "Meta description is short" });

  if (robots && /noindex/i.test(robots)) {
    issues.push({ code: "noindex", severity: "warning", message: "Page has noindex — Google may skip it" });
  }

  if (!/<h1[^>]*>/i.test(html)) {
    issues.push({ code: "missing_h1", severity: "warning", message: "No H1 found in HTML" });
  }

  return issues;
}

async function crawlOne(baseUrl: string, path: string): Promise<CrawlResult> {
  const url = `${baseUrl}${path === "/" ? "" : path}`;
  const started = Date.now();
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "Karmakoders-SEO-Crawler/1.0", Accept: "text/html" },
      redirect: "follow",
    });
    clearTimeout(timer);

    const html = response.headers.get("content-type")?.includes("text/html")
      ? await response.text()
      : "";

    const issues = analyzeHtml(html, response.status);

    return {
      url,
      path,
      status: response.status,
      ok: response.ok,
      title: html ? extractTitle(html) : null,
      metaDescription: html ? extractMeta(html, "description") : null,
      robots: html ? extractMeta(html, "robots") : null,
      canonical: html ? extractCanonical(html) : null,
      issues,
      responseMs: Date.now() - started,
    };
  } catch (error) {
    return {
      url,
      path,
      status: null,
      ok: false,
      title: null,
      metaDescription: null,
      robots: null,
      canonical: null,
      issues: [
        {
          code: "fetch_failed",
          severity: "critical",
          message: error instanceof Error ? error.message : "Request failed",
        },
      ],
      responseMs: Date.now() - started,
    };
  }
}

/** Crawl a list of paths against the live site (server-side). */
export async function crawlPaths(baseUrl: string, paths: string[]): Promise<CrawlResult[]> {
  const results: CrawlResult[] = [];
  const queue = [...paths];

  async function worker() {
    while (queue.length > 0) {
      const path = queue.shift();
      if (!path) break;
      results.push(await crawlOne(baseUrl, path));
    }
  }

  await Promise.all(Array.from({ length: Math.min(MAX_CONCURRENT, paths.length || 1) }, () => worker()));
  return results.sort((a, b) => a.path.localeCompare(b.path));
}
