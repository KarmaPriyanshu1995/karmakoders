import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { SUPPORT_EMAIL, SUPPORT_EMAIL_HREF } from "@/platform/config/contact";

// Built from parts so this file doesn't match its own scan.
const RETIRED_ADDRESS = ["support", "karmakoders.com"].join("@");

function sourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(full);
    return /\.(tsx?|jsx?|mdx?|json|css|html)$/.test(entry.name) ? [full] : [];
  });
}

describe("contact email", () => {
  it("is the business inbox in one shared constant", () => {
    expect(SUPPORT_EMAIL).toBe("info@karmakoders.com");
    expect(SUPPORT_EMAIL_HREF).toBe("mailto:info@karmakoders.com");
  });

  it(`never uses the non-existent ${RETIRED_ADDRESS} anywhere in src/`, () => {
    const offenders = sourceFiles(path.resolve(process.cwd(), "src")).filter((file) =>
      fs.readFileSync(file, "utf8").includes(RETIRED_ADDRESS)
    );
    expect(offenders).toEqual([]);
  });
});
