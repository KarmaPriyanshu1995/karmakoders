import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

/**
 * The signature fonts (Dancing Script, Great Vibes, Caveat) load only in the code-split typed
 * signature component. No layout, barrel or other module may import them or the component.
 */

const ROOT = path.resolve(__dirname, "../../../..");
const FONT_NAMES = /\b(Dancing_Script|Great_Vibes|Caveat)\b/;
/** A value import or re-export; `import type` is erased at build time and loads nothing. */
const STATIC_TYPED_SIGNATURE_IMPORT = /(?:import(?!\s+type\b)|export)[^;]*from\s+["'][^"']*typed-signature["']/;

function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === "node_modules" || entry.name === "generated" ? [] : walk(full);
    return /\.(ts|tsx)$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) ? [full] : [];
  });
}

const sources = walk(path.join(ROOT, "src")).map((file) => ({
  rel: path.relative(ROOT, file).split(path.sep).join("/"),
  text: fs.readFileSync(file, "utf8"),
}));

describe("signature fonts stay code-split", () => {
  it("only typed-signature.tsx references the signature fonts", () => {
    const users = sources.filter((s) => FONT_NAMES.test(s.text)).map((s) => s.rel);
    expect(users).toEqual(["src/modules/sign/ui/typed-signature.tsx"]);
  });

  it("no layout imports the fonts or the typed signature component", () => {
    const layouts = sources.filter((s) => /\/layout\.tsx$/.test(s.rel));
    expect(layouts.length).toBeGreaterThan(3);
    for (const layout of layouts) {
      expect(FONT_NAMES.test(layout.text), layout.rel).toBe(false);
      expect(/typed-signature/.test(layout.text), layout.rel).toBe(false);
    }
  });

  it("nothing imports typed-signature statically; the loader uses next/dynamic", () => {
    const staticImporters = sources.filter((s) => STATIC_TYPED_SIGNATURE_IMPORT.test(s.text)).map((s) => s.rel);
    expect(staticImporters).toEqual([]);
    const loader = sources.find((s) => s.rel === "src/modules/sign/ui/typed-signature-loader.tsx")!;
    expect(loader.text).toMatch(/dynamic\(\(\) => import\("\.\/typed-signature"\)/);
  });

  it("the ui barrel does not export the typed signature or its loader", () => {
    const barrel = sources.find((s) => s.rel === "src/modules/sign/ui/index.ts")!;
    expect(barrel.text).not.toMatch(/from\s+["']\.\/typed-signature/);
  });
});
