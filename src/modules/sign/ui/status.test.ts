import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { SIGN_DOCUMENT_STATUSES } from "@/platform/db/sign-status";
import { TONES } from "./colors";
import { DOCUMENT_STATUS, SIGNER_STATUS, SIGN_SIGNER_STATUSES, documentStatusLabel } from "./status";

function prismaEnum(name: string): string[] {
  const schema = fs.readFileSync(path.resolve(__dirname, "../../../../prisma/schema.prisma"), "utf8");
  const body = new RegExp(`enum ${name} \\{([^}]*)\\}`).exec(schema)?.[1] ?? "";
  return body
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => /^[A-Z_]+$/.test(line));
}

describe("Sign status vocabulary", () => {
  it("covers every SignDocumentStatus and SignSignerStatus in the Prisma schema", () => {
    expect(Object.keys(DOCUMENT_STATUS).sort()).toEqual(prismaEnum("SignDocumentStatus").sort());
    expect(Object.keys(DOCUMENT_STATUS).sort()).toEqual([...SIGN_DOCUMENT_STATUSES].sort());
    expect([...SIGN_SIGNER_STATUSES].sort()).toEqual(prismaEnum("SignSignerStatus").sort());
    expect(Object.keys(SIGNER_STATUS).sort()).toEqual([...SIGN_SIGNER_STATUSES].sort());
  });

  it.each([...Object.entries(DOCUMENT_STATUS), ...Object.entries(SIGNER_STATUS)])(
    "%s has a label, an icon and a site tone",
    (_status, meta) => {
      expect(meta.label.trim().length).toBeGreaterThan(0);
      // Sentence case: first letter upper, no shouting.
      expect(meta.label[0]).toBe(meta.label[0].toUpperCase());
      expect(meta.label).not.toBe(meta.label.toUpperCase());
      expect(meta.icon).toBeTruthy();
      expect(TONES[meta.tone]).toBeDefined();
    }
  );

  it("uses the agreed labels and tones", () => {
    expect(DOCUMENT_STATUS.DRAFT).toMatchObject({ label: "Draft", tone: "neutral" });
    expect(DOCUMENT_STATUS.SENT).toMatchObject({ label: "Waiting for signatures", tone: "info" });
    expect(DOCUMENT_STATUS.PARTIALLY_SIGNED).toMatchObject({ label: "In progress", tone: "warning" });
    expect(DOCUMENT_STATUS.COMPLETED).toMatchObject({ label: "Completed", tone: "success" });
    expect(DOCUMENT_STATUS.DECLINED).toMatchObject({ label: "Declined", tone: "danger" });
    expect(DOCUMENT_STATUS.EXPIRED).toMatchObject({ label: "Expired", tone: "neutral" });
    expect(DOCUMENT_STATUS.VOIDED).toMatchObject({ label: "Voided", tone: "neutral" });
    expect(SIGNER_STATUS.PENDING.label).toBe("Not yet opened");
    expect(SIGNER_STATUS.VIEWED.label).toBe("Opened");
    expect(SIGNER_STATUS.SIGNED.label).toBe("Signed");
    expect(SIGNER_STATUS.DECLINED.label).toBe("Declined");
  });

  it("every status that shares a tone is still told apart by its icon", () => {
    const icons = Object.values(DOCUMENT_STATUS).map((meta) => meta.icon);
    expect(new Set(icons).size).toBe(icons.length);
  });

  it("reads 'x of y signed' for PARTIALLY_SIGNED when counts are given", () => {
    expect(documentStatusLabel("PARTIALLY_SIGNED", { signed: 1, total: 3 })).toBe("1 of 3 signed");
    expect(documentStatusLabel("PARTIALLY_SIGNED")).toBe("In progress");
    expect(documentStatusLabel("PARTIALLY_SIGNED", { signed: 0, total: 0 })).toBe("In progress");
    expect(documentStatusLabel("SENT", { signed: 1, total: 3 })).toBe("Waiting for signatures");
  });
});
