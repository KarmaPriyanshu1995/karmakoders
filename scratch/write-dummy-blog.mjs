/**
 * UI smoke test: log into admin, choose every content block, fill a dummy blog, publish, verify.
 * Usage: node scratch/write-dummy-blog.mjs
 */
import nextEnv from "@next/env";
import { chromium } from "playwright-core";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const { loadEnvConfig } = nextEnv;

loadEnvConfig(process.cwd(), true);

const BASE = process.env.BASE || "http://localhost:3000";
const EMAIL = "dummy-blog-qa@karmakoders.test";
const PASSWORD = "DummyBlog-QA-2026!";
const SLUG = "dummy-kitchen-sink-blocks";
const TITLE = "Dummy kitchen sink: every content block in one post";
const MARKER = "DUMMY-KS-2026";

const ADD_PLAN = [
  { type: "blog", blocks: ["HEADING", "SUBHEADING", "PRO_TIP", "QUOTE", "CODE", "MERMAID", "COMPARISON_MATRIX", "CTA"] },
  { type: "case-study", blocks: ["STAT_BADGES", "BEFORE_AFTER"] },
  { type: "success-story", blocks: ["CLIENT_HEADER", "DEVICE_GALLERY", "TESTIMONIAL"] },
  { type: "startup-idea", blocks: ["TAM", "MVP_SCOPE", "TECH_STACK", "BUILD_BUDGET"] },
  { type: "prompt", blocks: ["COPY_PROMPT", "PROMPT_VARS", "USAGE_STEPS", "OUTPUT_PREVIEW"] },
];

const EXPECTED_TYPES = [
  "HEADING",
  "SUBHEADING",
  "PARAGRAPH",
  "PRO_TIP",
  "QUOTE",
  "CODE",
  "TOOL_EMBED",
  "MERMAID",
  "TLDR",
  "COMPARISON_MATRIX",
  "STAT_BADGES",
  "BEFORE_AFTER",
  "TAM",
  "MVP_SCOPE",
  "TECH_STACK",
  "BUILD_BUDGET",
  "CLIENT_HEADER",
  "DEVICE_GALLERY",
  "TESTIMONIAL",
  "COPY_PROMPT",
  "PROMPT_VARS",
  "USAGE_STEPS",
  "OUTPUT_PREVIEW",
  "CTA",
];

async function ensureUser() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set");
  const pool = new Pool({ connectionString });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
  try {
    const tenant = await prisma.tenant.findFirst({ where: { isPrimary: true } });
    if (!tenant) throw new Error("No primary tenant");
    const passwordHash = await bcrypt.hash(PASSWORD, 10);
    const user = await prisma.user.upsert({
      where: { email: EMAIL },
      update: { passwordHash, name: "Dummy Blog QA" },
      create: { email: EMAIL, name: "Dummy Blog QA", passwordHash },
    });
    await prisma.membership.upsert({
      where: { userId_tenantId: { userId: user.id, tenantId: tenant.id } },
      update: { role: "TENANT_ADMIN", status: "ACTIVE" },
      create: { userId: user.id, tenantId: tenant.id, role: "TENANT_ADMIN", status: "ACTIVE" },
    });
    const ok = await bcrypt.compare(PASSWORD, user.passwordHash);
    const memberships = await prisma.membership.count({ where: { userId: user.id, status: "ACTIVE" } });
    if (!ok || memberships === 0) {
      throw new Error(`Test user not login-ready (bcrypt=${ok} memberships=${memberships})`);
    }
    await prisma.post.deleteMany({ where: { tenantId: tenant.id, slug: SLUG } });
    return { prisma, pool, tenantId: tenant.id };
  } catch (err) {
    await prisma.$disconnect();
    await pool.end();
    throw err;
  }
}

function card(page, type) {
  return page.locator(`[data-block-card="${type}"]`).last();
}

async function fillLabeled(scope, label, value) {
  const field = scope.locator("label").filter({ hasText: label }).locator("input, textarea, select").first();
  await field.fill(value);
}

async function addBlock(page, type) {
  const option = page.locator(`[data-testid="add-block-option"][data-block-type="${type}"]`);
  await option.waitFor({ state: "visible", timeout: 10000 });
  await option.click();
  await card(page, type).waitFor({ state: "visible", timeout: 10000 });
}

async function setPostType(page, type) {
  await page.locator('select[name="type"]').selectOption(type);
}

async function fillExistingAndAdded(page) {
  const tldr = card(page, "TLDR");
  const tldrInputs = tldr.locator("input");
  await tldrInputs.nth(0).fill(`${MARKER} takeaway one: pick every block.`);
  await tldrInputs.nth(1).fill("Takeaway two: writers never touch HTML.");
  await tldrInputs.nth(2).fill("Takeaway three: public page must render them all.");

  const paragraph = card(page, "PARAGRAPH");
  await paragraph.locator(".ProseMirror").click();
  await paragraph.locator(".ProseMirror").fill(
    `This dummy kitchen-sink post (${MARKER}) is filled through the admin block picker so every section type can be checked on the public blog.`
  );

  await card(page, "TOOL_EMBED").locator("select").selectOption("DOMAIN_COMPARE");

  await fillLabeled(card(page, "HEADING"), "Text", `${MARKER} heading: architecture in 2026`);
  await fillLabeled(card(page, "SUBHEADING"), "Text", "Why a block builder beats a blank HTML field");
  await fillLabeled(card(page, "PRO_TIP"), "Title", "Pro tip");
  await fillLabeled(card(page, "PRO_TIP"), "Message", "Use one block per idea. Keep paragraphs short.");
  await fillLabeled(card(page, "QUOTE"), "Quote", "Ship the editor writers will actually use.");
  await fillLabeled(card(page, "QUOTE"), "Author", "KarmaKoders QA");
  await fillLabeled(card(page, "CODE"), "Language", "ts");
  await fillLabeled(card(page, "CODE"), "Code", "export const ok = true;");
  await fillLabeled(card(page, "MERMAID"), "Caption", "Dummy architecture");

  const matrix = card(page, "COMPARISON_MATRIX");
  const matrixInputs = matrix.locator("input");
  await matrixInputs.nth(0).fill("Hostinger");
  await matrixInputs.nth(1).fill("GoDaddy");
  await fillLabeled(matrix, "Row label", "First-year price");
  await matrix.locator("input").nth(3).fill("$2.99");
  await matrix.locator("input").nth(4).fill("$11.99");

  await fillLabeled(card(page, "CTA"), "Heading", "Ready to build this with us?");
  await fillLabeled(card(page, "CTA"), "Body", "Book a scoped architecture review.");
  await fillLabeled(card(page, "CTA"), "Button label", "Start Project");
  await fillLabeled(card(page, "CTA"), "Link", "/contact");

  const stats = card(page, "STAT_BADGES");
  await stats.locator("input").nth(0).fill("40%");
  await stats.locator("input").nth(1).fill("Faster LCP");
  await stats.locator("input").nth(2).fill("12");
  await stats.locator("input").nth(3).fill("Weeks to MVP");
  await stats.locator("input").nth(4).fill("$18k");
  await stats.locator("input").nth(5).fill("Build budget");

  const ba = card(page, "BEFORE_AFTER");
  await ba.locator("textarea").nth(0).fill("A 4,000-word HTML blob nobody wanted to edit.");
  await ba.locator("textarea").nth(1).fill("Pick a block, type plain language, publish.");

  await fillLabeled(card(page, "CLIENT_HEADER"), "Client", "Acme Logistics");
  await fillLabeled(card(page, "CLIENT_HEADER"), "Location", "Pune");
  await fillLabeled(card(page, "CLIENT_HEADER"), "Scope", "Ops dashboard");
  await fillLabeled(card(page, "DEVICE_GALLERY"), "Image URL", "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=1200");
  await fillLabeled(card(page, "DEVICE_GALLERY"), "Alt text", "Laptop showing a dashboard");
  await fillLabeled(card(page, "TESTIMONIAL"), "Quote", "The block editor made our writers faster.");
  await fillLabeled(card(page, "TESTIMONIAL"), "Name", "Riya Shah");
  await fillLabeled(card(page, "TESTIMONIAL"), "Role", "Head of Content");

  await fillLabeled(card(page, "TAM"), "Market size", "$12B by 2028");
  await fillLabeled(card(page, "TAM"), "Insight", "SMBs still buy domains through comparison pages.");
  const scope = card(page, "MVP_SCOPE");
  await scope.locator("input").nth(0).fill("Domain compare + compressor");
  await scope.locator("input").nth(1).fill("Marketplace billing");
  await card(page, "TECH_STACK").locator("button", { hasText: "Add item" }).click();
  await card(page, "TECH_STACK").locator("input").last().fill("Next.js + Prisma");
  await fillLabeled(card(page, "BUILD_BUDGET"), "Build time", "4 weeks");
  await fillLabeled(card(page, "BUILD_BUDGET"), "Budget", "$10k–$25k");

  await fillLabeled(card(page, "COPY_PROMPT"), "Title", "Launch tweet");
  await fillLabeled(card(page, "COPY_PROMPT"), "Prompt", "Write a launch tweet for a domain price comparison tool.");
  await fillLabeled(card(page, "PROMPT_VARS"), "Variable", "company_name");
  await fillLabeled(card(page, "PROMPT_VARS"), "Example", "KarmaKoders");
  await fillLabeled(card(page, "USAGE_STEPS"), "Step 1 title", "Paste the prompt");
  await fillLabeled(card(page, "USAGE_STEPS"), "Details", "Drop it into Cursor and generate the first draft.");
  await card(page, "OUTPUT_PREVIEW").locator("select").selectOption("code");
  await fillLabeled(card(page, "OUTPUT_PREVIEW"), "Content", `${MARKER} output preview`);
  await fillLabeled(card(page, "OUTPUT_PREVIEW"), "Caption", "Sample model output");
}

async function launchBrowser() {
  const attempts = [
    { channel: "chrome", headless: false },
    { channel: "msedge", headless: false },
    { channel: "chrome", headless: true },
    { channel: "msedge", headless: true },
  ];
  let lastErr;
  for (const opts of attempts) {
    try {
      const browser = await chromium.launch({ ...opts, slowMo: opts.headless ? 0 : 40 });
      return browser;
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr;
}

async function main() {
  const { prisma, pool, tenantId } = await ensureUser();
  const browser = await launchBrowser();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.setDefaultTimeout(45000);

  try {
    await page.goto(`${BASE}/admin/login`, { waitUntil: "domcontentloaded" });
    await page.getByLabel("Email address").click();
    await page.getByLabel("Email address").fill("");
    await page.getByLabel("Email address").pressSequentially(EMAIL, { delay: 15 });
    await page.getByLabel("Password").click();
    await page.getByLabel("Password").fill("");
    await page.getByLabel("Password").pressSequentially(PASSWORD, { delay: 15 });
    await page.getByRole("button", { name: "Sign in" }).click();
    const invalid = page.getByText("Invalid credentials");
    await Promise.race([
      page.waitForURL((url) => url.pathname.startsWith("/admin") && !url.pathname.includes("/login"), { timeout: 60000 }),
      invalid.waitFor({ state: "visible", timeout: 60000 }).then(async () => {
        throw new Error("Login rejected as invalid credentials");
      }),
    ]);

    await page.goto(`${BASE}/admin/blog/new`, { waitUntil: "domcontentloaded" });
    await page.getByRole("heading", { name: "Create New Post" }).waitFor({ state: "visible", timeout: 60000 });
    await page.locator('[data-testid="add-block-option"]').first().waitFor({ state: "visible", timeout: 60000 });

    await page.locator('input[name="title"]').fill(TITLE);
    await page.locator('input[name="slug"]').fill(SLUG);
    await page.locator('input[name="focusKeyword"]').fill("content block builder");
    await page.locator('input[name="category"]').fill("QA");
    await page.locator('input[name="author"]').fill("Dummy QA");
    await page.locator('input[name="image"]').fill("https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=1600");
    await page.locator('input[name="imageAlt"]').fill("Developer writing a blog post on a laptop");
    await page.locator('textarea[name="excerpt"]').fill(
      "Dummy kitchen-sink article that exercises every content block in the KarmaKoders editor, from TL;DR to diagrams and tools."
    );

    for (const step of ADD_PLAN) {
      await setPostType(page, step.type);
      for (const blockType of step.blocks) {
        await addBlock(page, blockType);
      }
    }

    await setPostType(page, "blog");
    await fillExistingAndAdded(page);

    await page.locator("#published").check();
    await page.locator("#noIndex").check();
    await page.getByRole("button", { name: "Save Post" }).click();
    await page.waitForURL(/\/admin\/blog/, { timeout: 60000 });

    const saved = await prisma.post.findFirst({ where: { tenantId, slug: SLUG } });
    if (!saved) throw new Error("Post was not saved to the database");
    const types = (Array.isArray(saved.blocks) ? saved.blocks : []).map((b) => b.type);
    const missing = EXPECTED_TYPES.filter((t) => !types.includes(t));
    if (missing.length) throw new Error(`Saved post missing block types: ${missing.join(", ")}`);

    const pub = await page.goto(`${BASE}/blog/${SLUG}`, { waitUntil: "domcontentloaded" });
    if (!pub || pub.status() !== 200) throw new Error(`Public post returned ${pub?.status()}`);
    const html = await page.content();
    if (html.includes("Can't resolve") || html.includes("Module not found")) {
      throw new Error("Public page compiled with a module error");
    }
    const publicMissing = [MARKER, "Acme Logistics", "Start Project", TITLE].filter((s) => !html.includes(s));
    if (publicMissing.length) throw new Error(`Public page missing: ${publicMissing.join(", ")}`);

    console.log("PASS dummy kitchen-sink blog");
    console.log(`  admin: ${BASE}/admin/blog/${saved.id}`);
    console.log(`  public: ${BASE}/blog/${SLUG}`);
    console.log(`  blocks: ${types.length} (${EXPECTED_TYPES.length} unique types)`);
  } catch (err) {
    console.error("Last URL:", page.url());
    try {
      await page.screenshot({ path: "scratch/dummy-blog-fail.png", fullPage: true });
      console.error("Saved screenshot: scratch/dummy-blog-fail.png");
    } catch {
      /* ignore */
    }
    throw err;
  } finally {
    await browser.close();
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch(async (err) => {
  console.error("FAIL dummy kitchen-sink blog");
  console.error(err);
  process.exit(1);
});
