import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

/**
 * Every Sign route, page and Server Action must read or change documents and signers through
 * the access modules (sign/documents/access.ts, sign/signing/*), never via Prisma directly —
 * otherwise an owner or signer check can be skipped by accident.
 */

const ROOT = path.resolve(__dirname, "../../..");
const SCANNED_DIRS = ["src/app/api/tools/sign", "src/app/tools/sign"];
const SERVER_ACTION_ROOTS = ["src/modules/sign", "src/app"];
const SOURCE_FILE = /\.(ts|tsx)$/;
const DIRECT_MODEL_ACCESS = /\.\s*(signDocument|signSigner|signSignerSession)\s*\./;

function walk(dir: string): string[] {
  const abs = path.join(ROOT, dir);
  if (!fs.existsSync(abs)) return [];
  return fs.readdirSync(abs, { withFileTypes: true }).flatMap((entry) => {
    const rel = path.join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === "node_modules" ? [] : walk(rel);
    return SOURCE_FILE.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) ? [rel] : [];
  });
}

function isServerActionFile(source: string): boolean {
  return /^\s*(?:\/\/[^\n]*\n|\/\*[\s\S]*?\*\/\s*)*["']use server["']/.test(source);
}

/** True when `source` queries a Sign document/signer model directly (multi-line chains included). */
function hasDirectModelAccess(source: string): boolean {
  return DIRECT_MODEL_ACCESS.test(source.replace(/\s+/g, " "));
}

function signFilesToScan(): string[] {
  const files = new Set(SCANNED_DIRS.flatMap(walk));
  for (const file of SERVER_ACTION_ROOTS.flatMap(walk)) {
    const source = fs.readFileSync(path.join(ROOT, file), "utf8");
    // Server Actions anywhere under Sign code, or any action that touches Sign models.
    if (isServerActionFile(source) && (file.includes(`${path.sep}sign`) || hasDirectModelAccess(source))) {
      files.add(file);
    }
  }
  return [...files].sort();
}

describe("Sign access boundary", () => {
  it("the scanner flags direct prisma / tx access to signDocument and signSigner", () => {
    expect(hasDirectModelAccess("const d = await prisma.signDocument.findMany();")).toBe(true);
    expect(hasDirectModelAccess("await tx.signSigner.update({ where })")).toBe(true);
    expect(hasDirectModelAccess("prisma\n  .signSignerSession\n  .findFirst()")).toBe(true);
    expect(hasDirectModelAccess("prisma. signDocument .count()")).toBe(true);
    expect(hasDirectModelAccess("getDocumentForOwner(customer.id, id)")).toBe(false);
    expect(isServerActionFile('"use server";\n\nexport async function x() {}')).toBe(true);
    expect(isServerActionFile('// comment\n"use server";')).toBe(true);
    expect(isServerActionFile('import "server-only";')).toBe(false);
  });

  it("finds the Sign app and API files it is meant to guard", () => {
    const files = signFilesToScan();
    expect(files.some((f) => f.includes(path.join("(signer)", "sign", "page.tsx")))).toBe(true);
    expect(files.some((f) => f.includes(path.join("api", "tools", "sign", "signing")))).toBe(true);
    expect(files.some((f) => f.endsWith(path.join("dashboard", "actions.ts")))).toBe(true);
  });

  it("no Sign route, page or Server Action queries Sign documents/signers via Prisma directly", () => {
    const offenders = signFilesToScan().flatMap((file) => {
      const source = fs.readFileSync(path.join(ROOT, file), "utf8");
      return hasDirectModelAccess(source) ? [file] : [];
    });
    expect(offenders, `Use src/modules/sign/documents/access.ts or sign/signing/* instead:\n${offenders.join("\n")}`).toEqual([]);
  });
});
