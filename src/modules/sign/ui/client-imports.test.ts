import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

/**
 * The "@/modules/sign/ui" barrel also exports server-only marketing components (the pricing
 * components read plans.ts, which imports "server-only"). A Client Component that imports the
 * barrel breaks the page at runtime, so client code imports Sign UI modules by path.
 */

const ROOT = path.resolve(__dirname, "../../../..");
const BARREL_IMPORT = /from\s+["'](?:@\/modules\/sign\/ui|\.\/index|\.)["']/;

function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === "node_modules" || entry.name === "generated" ? [] : walk(full);
    return /\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) ? [full] : [];
  });
}

describe("Sign UI client imports", () => {
  it('no "use client" module imports the server-only-capable ui barrel', () => {
    const offenders = walk(path.join(ROOT, "src"))
      .filter((file) => {
        const source = fs.readFileSync(file, "utf8");
        return /^\s*["']use client["']/.test(source) && BARREL_IMPORT.test(source);
      })
      .map((file) => path.relative(ROOT, file).split(path.sep).join("/"));
    expect(offenders).toEqual([]);
  });

  it("detects a barrel import", () => {
    expect(BARREL_IMPORT.test('import { Button } from "@/modules/sign/ui";')).toBe(true);
    expect(BARREL_IMPORT.test('import { Button } from "@/modules/sign/ui/button";')).toBe(false);
  });
});
