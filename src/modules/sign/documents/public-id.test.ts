import { describe, expect, it } from "vitest";
import {
  PUBLIC_ID_ALPHABET,
  generatePublicId,
  isValidPublicId,
} from "@/modules/sign/documents/public-id";

describe("Sign document publicId", () => {
  it("uses the KKS-YYYY-XXXXXX format with the UTC year", () => {
    const id = generatePublicId(new Date("2026-12-31T23:59:59.000Z"));
    expect(id).toMatch(/^KKS-2026-[A-Z0-9]{6}$/);
    expect(generatePublicId(new Date("2027-01-01T00:00:00.000Z")).startsWith("KKS-2027-")).toBe(true);
    expect(isValidPublicId(id)).toBe(true);
  });

  it("excludes ambiguous characters from the alphabet", () => {
    for (const ch of ["0", "O", "1", "I", "L"]) expect(PUBLIC_ID_ALPHABET).not.toContain(ch);
    expect(new Set(PUBLIC_ID_ALPHABET).size).toBe(PUBLIC_ID_ALPHABET.length);
  });

  it("only emits alphabet characters and is effectively unique", () => {
    const ids = new Set<string>();
    for (let i = 0; i < 10_000; i++) {
      const id = generatePublicId();
      for (const ch of id.slice(-6)) expect(PUBLIC_ID_ALPHABET).toContain(ch);
      ids.add(id);
    }
    // 31^6 space: a handful of collisions in 10k would indicate a broken RNG.
    expect(ids.size).toBeGreaterThanOrEqual(9_995);
  });

  it("rejects malformed ids", () => {
    for (const bad of ["", "KKS-2026-ABC", "KKS-2026-ABCDE0", "kks-2026-ABCDEF", "KKS-26-ABCDEF", "KKS-2026-ABCDEFG"]) {
      expect(isValidPublicId(bad)).toBe(false);
    }
  });
});
