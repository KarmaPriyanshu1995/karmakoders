/**
 * CMS / IA QA runner — positive + negative cases against a running Next server.
 * Usage: node scripts/qa-cms.mjs
 * Optional: BASE=http://localhost:3000 node scripts/qa-cms.mjs
 */
const BASE = process.env.BASE || "http://localhost:3000";

const results = [];

function record(id, type, name, ok, detail = "") {
  results.push({ id, type, name, status: ok ? "PASS" : "FAIL", detail: String(detail).slice(0, 280) });
}

async function fetchRes(path, init = {}) {
  const url = path.startsWith("http") ? path : BASE + path;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 25000);
  try {
    const res = await fetch(url, { redirect: init.redirect ?? "follow", ...init, signal: ctrl.signal });
    const text = await res.text();
    return { res, text, status: res.status, url: res.url };
  } finally {
    clearTimeout(timer);
  }
}

function includesAll(hay, needles) {
  return needles.filter((n) => !hay.includes(n));
}

async function main() {
  console.log(`KK QA against ${BASE}\n`);

  const hubs = [
    "/",
    "/work",
    "/insights",
    "/blog",
    "/case-studies",
    "/success-stories",
    "/startup-ideas",
    "/prompts",
    "/free-tools",
    "/pricing",
    "/about",
    "/contact",
    "/portfolio",
    "/careers",
    "/services",
  ];

  for (const path of hubs) {
    try {
      const { status, text } = await fetchRes(path);
      record("H200-" + path, "POS", `${path} returns 200`, status === 200, "status " + status);
      record(
        "H500-" + path,
        "NEG",
        `${path} is not an error page`,
        status === 200 && !/Application error|Internal Server Error/i.test(text),
        "status " + status
      );
      record(
        "CTA-" + path,
        "POS",
        `${path} Start Project → /contact`,
        /Start Project[\s\S]{0,120}href="\/contact"|href="\/contact"[\s\S]{0,80}Start Project/.test(text) ||
          (text.includes("Start Project") && text.includes('href="/contact"')),
        text.includes("Start Project") ? "CTA present" : "CTA missing"
      );
    } catch (err) {
      record("H200-" + path, "POS", `${path} reachable`, false, err.message);
    }
  }

  try {
    const { text, status } = await fetchRes("/");
    const missing = includesAll(text, [
      "/portfolio",
      "/case-studies",
      "/success-stories",
      "/blog",
      "/startup-ideas",
      "/prompts",
      "/free-tools",
      "/careers",
      "/services",
      "/work",
      "/insights",
      "/contact",
    ]);
    record("N04", "POS", "Homepage HTML contains all IA links", status === 200 && missing.length === 0, missing.join(", "));
    record("N05", "POS", "Brand mark present", text.includes("Karmakoders"));
    record(
      "N03",
      "NEG",
      "Homepage does not use old 8-tab overflow copy as the only nav",
      text.includes("Insights") && text.includes("Work") && text.includes("Start Project")
    );
    const footerNeed = ["Success Stories", "Startup Ideas", "Free Prompts", "MVP Cost Calculator"];
    const footerMissing = includesAll(text, footerNeed);
    record("F01", "POS", "Footer includes new IA + calculator", footerMissing.length === 0, footerMissing.join(", "));
  } catch (err) {
    record("N04", "POS", "Homepage IA crawl", false, err.message);
  }

  for (const path of ["/success-stories", "/startup-ideas", "/prompts"]) {
    try {
      const { status, text } = await fetchRes(path);
      record(
        "E-" + path,
        "POS",
        `${path} empty or populated without crashing`,
        status === 200 && (/Nothing published here yet|Read/i.test(text) || /h1/i.test(text)),
        "status " + status
      );
    } catch (err) {
      record("E-" + path, "POS", path, false, err.message);
    }
  }

  const ghosts = [
    "/blog/this-slug-does-not-exist-kk-qa-404",
    "/insights/this-slug-does-not-exist-kk-qa-404",
    "/free-tools/not-a-real-tool-kk-qa",
    "/no-such-marketing-page-kk-qa",
  ];
  for (const path of ghosts) {
    try {
      const { status, text, url } = await fetchRes(path);
      const handled =
        status !== 500 &&
        (status === 404 || url.includes("/404") || /not found|page not found/i.test(text));
      record("404-" + path, "NEG", `Unknown URL handled (${path})`, handled, `status ${status} → ${url}`);
    } catch (err) {
      record("404-" + path, "NEG", path, false, err.message);
    }
  }

  try {
    const { res } = await fetchRes("/insights/hello-world", { redirect: "manual" });
    const loc = res.headers.get("location") || "";
    record(
      "R01",
      "POS",
      "/insights/:slug redirects to /blog/:slug",
      [301, 302, 303, 307, 308].includes(res.status) && loc.includes("/blog/hello-world"),
      `${res.status} ${loc}`
    );
  } catch (err) {
    record("R01", "POS", "insights redirect", false, err.message);
  }

  try {
    const { status, text } = await fetchRes("/sitemap.xml");
    const missing = includesAll(text, ["/work", "/insights", "/success-stories", "/startup-ideas", "/prompts", "/blog"]);
    record("S01", "POS", "Sitemap lists new hubs", status === 200 && missing.length === 0, missing.join(", ") || "ok");
  } catch (err) {
    record("S01", "POS", "sitemap.xml", false, err.message);
  }

  try {
    const { status } = await fetchRes("/robots.txt");
    record("S02", "POS", "robots.txt served", status === 200, "status " + status);
  } catch (err) {
    record("S02", "POS", "robots.txt", false, err.message);
  }

  try {
    const { status, text } = await fetchRes("/free-tools/mvp-cost-calculator");
    record("T01", "POS", "MVP calculator page renders", status === 200 && /MVP Cost Calculator/i.test(text), "status " + status);
    record("T02", "POS", "Calculator has three <select> controls", (text.match(/<select/g) || []).length >= 3);
    record("T03", "POS", "WhatsApp export link present", /wa\.me\//.test(text));
    record("T04", "POS", "Email export link present", /mailto:info@karmakoders\.com/.test(text));
    record("T05", "NEG", "Calculator does not claim a fixed bid", !/fixed bid|guaranteed quote/i.test(text));
  } catch (err) {
    record("T01", "POS", "MVP calculator", false, err.message);
  }

  try {
    const { text } = await fetchRes("/blog");
    const match = text.match(/href="(\/blog\/[a-z0-9-]+)"/i);
    if (!match) {
      results.push({
        id: "A00",
        type: "POS",
        name: "At least one published article to inspect",
        status: "SKIP",
        detail: "No /blog/:slug links on listing",
      });
    } else {
      const href = match[1];
      const { status, text: html } = await fetchRes(href);
      record("A01", "POS", "Article 200", status === 200, href);
      record("A02", "POS", "Reading time shown", /min read/i.test(html));
      const ldBlocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
      let jsonOk = 0;
      let jsonBad = 0;
      for (const block of ldBlocks) {
        try {
          JSON.parse(block[1]);
          jsonOk++;
        } catch {
          jsonBad++;
        }
      }
      record("A03", "POS", "JSON-LD parses", jsonOk > 0 && jsonBad === 0, `ok=${jsonOk} bad=${jsonBad}`);
      record("A04", "POS", "Title tag present", /<title>/i.test(html));
      record(
        "A05",
        "POS",
        "Format CTA block present",
        /Next step|Subscribe for updates|WhatsApp|Cal\.com|roadmap|Schedule an AI call/i.test(html)
      );
      record("A06", "NEG", "Article did not crash", !/Application error/i.test(html));
    }
  } catch (err) {
    record("A01", "POS", "article inspect", false, err.message);
  }

  try {
    const { status } = await fetchRes("/blog/this-slug-does-not-exist-kk-qa-404/opengraph-image");
    record("OG01", "NEG", "OG image for missing slug is not 500", status !== 500, "status " + status);
  } catch (err) {
    record("OG01", "NEG", "OG missing slug", false, err.message);
  }

  try {
    const { status, text, url } = await fetchRes("/admin/blog/new");
    const blocked =
      url.includes("/admin/login") ||
      /sign in|login|unauthor/i.test(text) ||
      status === 401 ||
      status === 403;
    record("ADM01", "NEG", "Anonymous user cannot open post editor", blocked, `${status} ${url}`);
  } catch (err) {
    record("ADM01", "NEG", "admin gate", false, err.message);
  }

  const summary = {
    generatedAt: new Date().toISOString(),
    origin: BASE,
    total: results.length,
    pass: results.filter((r) => r.status === "PASS").length,
    fail: results.filter((r) => r.status === "FAIL").length,
    skip: results.filter((r) => r.status === "SKIP").length,
    failures: results.filter((r) => r.status === "FAIL"),
    results,
  };

  console.table(results.map(({ id, type, status, name, detail }) => ({ id, type, status, name, detail })));
  console.log(`\nSUMMARY  ${summary.pass} passed / ${summary.fail} failed / ${summary.skip} skipped`);
  if (summary.failures.length) {
    console.log("\nFAILURES");
    for (const f of summary.failures) console.log(` - ${f.id}: ${f.name} :: ${f.detail}`);
  }
  process.exitCode = summary.fail ? 1 : 0;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
