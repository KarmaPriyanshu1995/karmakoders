import { describe, expect, it, vi } from "vitest";
import type { Metadata } from "next";

vi.mock("next/navigation", () => ({ notFound: vi.fn(), redirect: vi.fn(), useRouter: vi.fn() }));

const TOKEN = "tok_9f8e7d6c5b4a3210ZYXWVUTSRQ";

const SIGNER_MODULES = {
  layout: () => import("./layout"),
  "s/invalid": () => import("./s/invalid/page"),
  "s/not-yet": () => import("./s/not-yet/page"),
  sign: () => import("./sign/page"),
} as const;

async function collectSignerMetadata(): Promise<Metadata[]> {
  const out: Metadata[] = [];
  for (const load of Object.values(SIGNER_MODULES)) {
    const mod = (await load()) as Record<string, unknown>;
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

  it("is noindex, nofollow with no-referrer (signer layout covers every signer page)", async () => {
    for (const metadata of await collectSignerMetadata()) {
      expect(metadata.robots).toMatchObject({ index: false, follow: false });
      expect(metadata.referrer).toBe("no-referrer");
    }
  });

  it("no signer page exports generateMetadata (a token would be in scope)", async () => {
    for (const load of Object.values(SIGNER_MODULES)) {
      expect(((await load()) as Record<string, unknown>).generateMetadata).toBeUndefined();
    }
  });

  it("the token URL is a route handler (GET only), not a page", async () => {
    const route = (await import("./s/[token]/route")) as Record<string, unknown>;
    expect(typeof route.GET).toBe("function");
    for (const method of ["POST", "PUT", "PATCH", "DELETE", "HEAD"]) expect(route[method]).toBeUndefined();
  });
});

describe("signer response headers (next.config.ts)", () => {
  it.each(["/tools/sign/s/:path*", "/tools/sign/sign", "/tools/sign/sign/:path*"])(
    "%s: no-referrer, noindex and no-store, after the global policy",
    async (source) => {
      const { default: config } = await import("../../../../../next.config");
      const rules = await config.headers!();
      const globalIndex = rules.findIndex((r) => r.source === "/:path*");
      const index = rules.findIndex((r) => r.source === source);
      expect(index).toBeGreaterThan(globalIndex);
      expect(rules[index].headers).toEqual(
        expect.arrayContaining([
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
          { key: "Cache-Control", value: "no-store" },
        ])
      );
    }
  );
});

describe("isSensitivePath", () => {
  it("flags signer links and signer pages only", async () => {
    const { isSensitivePath } = await import("@/platform/privacy/sensitive-paths");
    expect(isSensitivePath(`/tools/sign/s/${TOKEN}`)).toBe(true);
    expect(isSensitivePath("/tools/sign/s")).toBe(true);
    expect(isSensitivePath("/tools/sign/sign")).toBe(true);
    expect(isSensitivePath("/tools/sign/sign/review")).toBe(true);
    expect(isSensitivePath("/tools/sign")).toBe(false);
    expect(isSensitivePath("/tools/sign/templates")).toBe(false);
    expect(isSensitivePath("/tools/signature")).toBe(false);
    expect(isSensitivePath("/tools/sign/signup")).toBe(false);
    expect(isSensitivePath(null)).toBe(false);
  });
});
