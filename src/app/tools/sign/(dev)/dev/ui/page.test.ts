import fs from "fs";
import path from "path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { isValidElement } from "react";

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));
// The preview itself is a large client component; this test only covers the gate.
vi.mock("./ui-preview", () => ({ UiPreview: () => null }));

// Imported once under NODE_ENV=test: loading it while NODE_ENV is stubbed to "production" would
// resolve React's production JSX runtime and break the later development render.
const page = await import("./page");

afterEach(() => vi.unstubAllEnvs());

async function load() {
  return page;
}

describe("/tools/sign/dev/ui", () => {
  it.each(["production", "test"])("is a 404 when NODE_ENV=%s", async (env) => {
    vi.stubEnv("NODE_ENV", env);
    const Page = (await load()).default;
    expect(() => Page()).toThrow("NEXT_NOT_FOUND");
  });

  it("renders in development", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const Page = (await load()).default;
    expect(isValidElement(Page())).toBe(true);
  });

  it("is noindex and rendered per request", async () => {
    const mod = await load();
    expect(mod.metadata.robots).toMatchObject({ index: false, follow: false });
    expect(mod.dynamic).toBe("force-dynamic");
  });

  it("is not listed in the sitemap or robots sources", () => {
    const root = path.resolve(__dirname, "../../../../../../..");
    const candidates = ["src/app/sitemap.ts", "src/lib/seo/sitemap-builder.ts", "src/app/robots.ts"]
      .map((rel) => path.join(root, rel))
      .filter((file) => fs.existsSync(file));
    expect(candidates.length).toBeGreaterThan(0);
    for (const file of candidates) {
      expect(fs.readFileSync(file, "utf8")).not.toMatch(/tools\/sign\/dev/);
    }
  });
});
