import { describe, expect, it } from "vitest";
import { UPLOAD_PDF_MAX_BYTES } from "@/modules/sign/documents/upload-limits";
import { FIELD_SIZE, clampPosition, nextDefaultPosition, signersMissingSignature, validatePdfFile, type PlacedField } from "./upload-state";

describe("validatePdfFile", () => {
  it("accepts a PDF within the limit", () => {
    expect(validatePdfFile({ name: "a.pdf", type: "application/pdf", size: 1000 }, UPLOAD_PDF_MAX_BYTES)).toBeNull();
    expect(validatePdfFile({ name: "a.PDF", type: "", size: 1000 }, UPLOAD_PDF_MAX_BYTES)).toBeNull();
  });

  it("rejects other types, empty files and files over the limit with what to do", () => {
    expect(validatePdfFile({ name: "a.docx", type: "application/msword", size: 10 }, UPLOAD_PDF_MAX_BYTES)).toMatch(/Only PDF files/);
    expect(validatePdfFile({ name: "a.pdf", type: "application/pdf", size: 0 }, UPLOAD_PDF_MAX_BYTES)).toMatch(/empty/);
    expect(validatePdfFile({ name: "a.pdf", type: "application/pdf", size: 15 * 1024 * 1024 }, UPLOAD_PDF_MAX_BYTES)).toBe(
      "This PDF is 15 MB. The limit is 10 MB. Compress it or split it and try again."
    );
  });
});

describe("field placement", () => {
  it("keeps fields fully on the page", () => {
    expect(clampPosition("signature", 95, 99)).toEqual({ x: 100 - FIELD_SIZE.signature.w, y: 100 - FIELD_SIZE.signature.h });
    expect(clampPosition("checkbox", -5, -5)).toEqual({ x: 0, y: 0 });
  });

  it("stacks keyboard-placed fields so they don't overlap", () => {
    const first = nextDefaultPosition([], 1, "text");
    const placed: PlacedField[] = [{ id: "f1", type: "text", signerId: "s1", page: 1, ...first }];
    expect(nextDefaultPosition(placed, 1, "text").y).toBeGreaterThan(first.y);
    expect(nextDefaultPosition(placed, 2, "text")).toEqual(first);
  });

  it("lists signers without a signature field", () => {
    const fields: PlacedField[] = [
      { id: "f1", type: "signature", signerId: "s1", page: 1, x: 0, y: 0 },
      { id: "f2", type: "date", signerId: "s2", page: 1, x: 0, y: 0 },
    ];
    expect(signersMissingSignature([{ id: "s1" }, { id: "s2" }], fields)).toEqual([{ id: "s2" }]);
  });
});
