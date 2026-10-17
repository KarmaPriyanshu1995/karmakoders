import { afterEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("next/navigation", () => ({ notFound: vi.fn(), redirect: vi.fn(), useRouter: () => ({ refresh: vi.fn() }) }));

type Context = {
  sessionId: string;
  signer: { id: string; documentId: string; name: string; email: string; order: number; status: string; signedAt: null; declinedAt: null; otpVerifiedAt: Date | null };
  document: { id: string; title: string; status: string; signingOrder: string; expiresAt: null; voidedAt: null; deletedAt: null };
};

let current: Context | null = null;
vi.mock("@/modules/sign/signing/signer-session", () => ({ getCurrentSigner: vi.fn(async () => current) }));

const getSignerPageDetails = vi.fn(async (ctx: Context) => ({
  documentTitle: ctx.document.title,
  senderName: "Real Sender Co",
  brand: { companyName: "Real Sender Co", logoUrl: null },
  signerName: ctx.signer.name,
  maskedEmail: "r***@realmail.test",
  message: "Real message from the sender",
}));
vi.mock("@/modules/sign/signing/signer-view", () => ({ getSignerPageDetails: (ctx: Context) => getSignerPageDetails(ctx) }));

const SIGNER_DIR = path.join(process.cwd(), "src/app/tools/sign/(signer)");

function context(otpVerifiedAt: Date | null): Context {
  return {
    sessionId: "sess-1",
    signer: { id: "sig-1", documentId: "doc-1", name: "Riley Real", email: "riley@realmail.test", order: 1, status: "VIEWED", signedAt: null, declinedAt: null, otpVerifiedAt },
    document: { id: "doc-1", title: "Real lease agreement", status: "SENT", signingOrder: "PARALLEL", expiresAt: null, voidedAt: null, deletedAt: null },
  };
}

async function renderSignPage(): Promise<string> {
  const { default: Page } = await import("./sign/page");
  return renderToStaticMarkup((await Page()) as ReactElement);
}

afterEach(() => {
  current = null;
  vi.clearAllMocks();
});

describe("real signer routes", () => {
  it("no file under (signer) imports the fixtures", () => {
    const walk = (dir: string): string[] =>
      fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]));
    const files = walk(SIGNER_DIR).filter((file) => !/\.test\.tsx?$/.test(file));
    expect(files.length).toBeGreaterThan(5);
    const offenders = files.filter((file) =>
      /from\s+["'](?:@\/modules\/sign\/ui\/fixtures|[./]+.*\/fixtures)(?:\/[^"']*)?["']|import\(["'][^"']*fixtures/.test(fs.readFileSync(file, "utf8"))
    );
    expect(offenders).toEqual([]);
  });

  it("no session: the expired state, without branding", async () => {
    const html = await renderSignPage();
    expect(html).toContain("Your signing session has expired");
    expect(html).toContain("Secured by");
    expect(getSignerPageDetails).not.toHaveBeenCalled();
  });

  it("before the email code: real title, sender and masked email; no fixture data", async () => {
    current = context(null);
    const html = await renderSignPage();
    expect(getSignerPageDetails).toHaveBeenCalledWith(current);
    expect(html).toContain("Real lease agreement");
    expect(html).toContain("Real Sender Co");
    expect(html).toContain("r***@realmail.test");
    expect(html).toContain("Email me a code");
    expect(html).not.toContain("riley@realmail.test");
    expect(html).not.toMatch(/Northwind|Acme Robotics|Jordan|j\*\*\*@example\.com/);
  });

  it("after the email code: consent with real data, no sample document", async () => {
    current = context(new Date());
    const html = await renderSignPage();
    expect(html).toContain("Agree to sign electronically");
    expect(html).toContain("Real lease agreement");
    expect(html).toContain("I agree to use electronic records and signatures");
    expect(html).not.toMatch(/Northwind|Acme Robotics|Mutual Non-Disclosure/);
  });

  it("the review on a real route never uses sample pages (safe state until Step 9)", () => {
    const source = fs.readFileSync(path.join(SIGNER_DIR, "sign/page.tsx"), "utf8");
    expect(source).toMatch(/pages: \[\], fields: \[\]/);
  });

  it("consent, sign and decline are marked TODO(Step 9) placeholders that change nothing", () => {
    const source = fs.readFileSync(path.join(SIGNER_DIR, "sign/signer-flow-live.tsx"), "utf8");
    expect(source.match(/TODO\(Step 9\)/g)?.length).toBeGreaterThanOrEqual(3);
    expect(source).not.toMatch(/fetch\(|prisma|appendAuditEvent/);
  });

  it.each([
    ["s/invalid", () => import("./s/invalid/page"), "This link is no longer valid"],
    ["s/not-yet", () => import("./s/not-yet/page"), "It&#x27;s not your turn yet"],
  ] as const)("%s renders inside the signer shell without branding", async (_name, load, title) => {
    const { default: Page } = await load();
    const html = renderToStaticMarkup(Page() as ReactElement);
    expect(html).toContain(title);
    expect(html).toContain("Karmakoders");
    expect(html).toContain("Secured by");
    expect(html).toContain('href="/legal/esign-disclosure"');
  });

  it("the signer OTP form still posts to the 5B endpoints with no email in the body", () => {
    const source = fs.readFileSync(path.join(SIGNER_DIR, "sign/signer-otp-form.tsx"), "utf8");
    expect(source).toContain('postJson("/api/tools/sign/signing/otp/request", {})');
    expect(source).toContain('postJson("/api/tools/sign/signing/otp/verify", { code })');
    expect(source).toContain('credentials: "same-origin"');
    expect(source).not.toMatch(/email\s*:/);
    expect(source).not.toMatch(/console\.|logEvent/);
  });
});

describe("signer review layout at 360px (class checks, best effort)", () => {
  const SCREENS = path.join(process.cwd(), "src/modules/sign/ui/screens/signer");
  const sources = ["review-screen.tsx", "signer-shell.tsx", "sign-dialog.tsx", "signer-flow.tsx", "signature-pad.tsx"].map((f) => ({
    file: f,
    text: fs.readFileSync(path.join(SCREENS, f), "utf8"),
  }));

  it("no fixed widths wider than a 360px phone, no sideways scrolling", () => {
    for (const { file, text } of sources) {
      for (const m of text.matchAll(/\b(?:min-)?w-\[(\d+)px\]/g)) expect(Number(m[1]), `${file}: ${m[0]}`).toBeLessThanOrEqual(328);
      for (const m of text.matchAll(/\b(?:min-)?w-\[(\d+(?:\.\d+)?)rem\]/g)) expect(Number(m[1]) * 16, `${file}: ${m[0]}`).toBeLessThanOrEqual(328);
      expect(text, file).not.toMatch(/overflow-x-(?:auto|scroll)|overflow-scroll|whitespace-nowrap|\bw-screen\b|min-w-max/);
    }
  });

  it("pages fit the width and keep the letter aspect; text scales with the page", () => {
    const review = sources.find((s) => s.file === "review-screen.tsx")!.text;
    expect(review).toContain("@container relative aspect-[8.5/11] w-full overflow-hidden");
    expect(review).toMatch(/text-\[length:[\d.]+cqw\]/);
    expect(review).toContain("min-w-0");
  });

  it("pinch-zoom stays allowed (no maximum-scale or user-scalable anywhere)", () => {
    for (const file of ["src/app/layout.tsx", "src/app/tools/sign/(signer)/layout.tsx"]) {
      expect(fs.readFileSync(path.join(process.cwd(), file), "utf8"), file).not.toMatch(/maximumScale|maximum-scale|userScalable|user-scalable/);
    }
  });

  it("primary actions are at least 44px", () => {
    const review = sources.find((s) => s.file === "review-screen.tsx")!.text;
    expect(review).toContain('minHeight: "2.75rem"');
  });
});
