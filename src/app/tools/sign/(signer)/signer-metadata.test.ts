import { describe, expect, it, vi } from "vitest";
import type { Metadata } from "next";

vi.mock("next/navigation", () => ({ notFound: vi.fn() }));

const TOKEN = "tok_9f8e7d6c5b4a3210ZYXWVUTSRQ";

async function collectSignerMetadata(): Promise<Metadata[]> {
  const page = (await import("./s/[token]/page")) as Record<string, unknown>;
  const layout = (await import("./layout")) as Record<string, unknown>;
  const out: Metadata[] = [];
  for (const mod of [page, layout]) {
    if (mod.metadata) out.push(mod.metadata as Metadata);
    if (typeof mod.generateMetadata === "function") {
      out.push(
        await (mod.generateMetadata as (p: unknown) => Promise<Metadata>)({
          params: Promise.resolve({ token: TOKEN }),
        })
      );
    }
  }
  return out;
}

describe("signer page metadata", () => {
  it("never contains the URL token", async () => {
    const all = await collectSignerMetadata();
    expect(all.length).toBeGreaterThan(0);
    expect(JSON.stringify(all)).not.toContain(TOKEN);
  });

  it("has no canonical or OG URL", async () => {
    for (const metadata of await collectSignerMetadata()) {
      expect(metadata.alternates?.canonical).toBeUndefined();
      expect((metadata.openGraph as { url?: unknown } | undefined)?.url).toBeUndefined();
    }
  });

  it("is noindex, nofollow with no-referrer", async () => {
    for (const metadata of await collectSignerMetadata()) {
      expect(metadata.robots).toMatchObject({ index: false, follow: false });
      expect(metadata.referrer).toBe("no-referrer");
    }
  });

  it("does not export generateMetadata (token would be in scope)", async () => {
    const page = (await import("./s/[token]/page")) as Record<string, unknown>;
    expect(page.generateMetadata).toBeUndefined();
  });
});

describe("signer response headers (next.config.ts)", () => {
  it("sets Referrer-Policy: no-referrer for /tools/sign/s/*, after the global policy", async () => {
    const { default: config } = await import("../../../../../next.config");
    const rules = await config.headers!();
    const globalIndex = rules.findIndex((r) => r.source === "/:path*");
    const signerIndex = rules.findIndex((r) => r.source === "/tools/sign/s/:path*");
    expect(signerIndex).toBeGreaterThan(globalIndex);
    expect(rules[signerIndex].headers).toEqual(
      expect.arrayContaining([{ key: "Referrer-Policy", value: "no-referrer" }])
    );
  });
});

describe("isSensitivePath", () => {
  it("flags signer links only", async () => {
    const { isSensitivePath } = await import("@/platform/privacy/sensitive-paths");
    expect(isSensitivePath(`/tools/sign/s/${TOKEN}`)).toBe(true);
    expect(isSensitivePath("/tools/sign/s")).toBe(true);
    expect(isSensitivePath("/tools/sign")).toBe(false);
    expect(isSensitivePath("/tools/sign/templates")).toBe(false);
    expect(isSensitivePath("/tools/signature")).toBe(false);
    expect(isSensitivePath(null)).toBe(false);
  });
});
