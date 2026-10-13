import { beforeEach, describe, expect, it, vi } from "vitest";
import { TEST_TOKEN_PEPPER } from "@/modules/sign/test-support/sign-fixtures";

const findUnique = vi.fn();
const count = vi.fn();
vi.mock("@/platform/db", () => ({
  prisma: { signSigner: { findUnique: (...a: unknown[]) => findUnique(...a), count: (...a: unknown[]) => count(...a) } },
  withDbRetry: <T,>(fn: () => Promise<T>) => fn(),
}));

const { createSignerToken, evaluateSignerAccess, resolveSignerToken } = await import("./signer-access");
const { hashSignerToken } = await import("@/platform/auth/crypto");

const NOW = new Date("2026-10-12T09:00:00Z");
const DOC_ID = "0192f0c4-0000-7000-8000-00000000000d";

const signer = {
  id: "0192f0c4-0000-7000-8000-000000000001",
  documentId: DOC_ID,
  name: "Jane",
  email: "jane@example.com",
  order: 2,
  status: "PENDING" as const,
  signedAt: null,
  declinedAt: null,
  otpVerifiedAt: null,
};
const document = {
  id: DOC_ID,
  title: "NDA",
  status: "SENT" as const,
  signingOrder: "PARALLEL" as const,
  expiresAt: new Date("2026-10-20T00:00:00Z"),
  voidedAt: null,
  deletedAt: null,
};

beforeEach(() => {
  vi.stubEnv("TOKEN_PEPPER", TEST_TOKEN_PEPPER);
  vi.stubEnv("SESSION_SECRET", TEST_TOKEN_PEPPER);
  vi.spyOn(console, "warn").mockImplementation(() => undefined);
  vi.spyOn(console, "info").mockImplementation(() => undefined);
  findUnique.mockReset();
  count.mockReset();
});

describe("createSignerToken", () => {
  it("returns a 43-char base64url token and only its HMAC for storage", () => {
    const { rawToken, tokenHash } = createSignerToken();
    expect(rawToken).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(tokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(tokenHash).not.toContain(rawToken);
    expect(tokenHash).toBe(hashSignerToken(rawToken));
    expect(createSignerToken().rawToken).not.toBe(rawToken);
  });
});

describe("resolveSignerToken — format check before any DB query", () => {
  const valid = "A".repeat(43);
  it.each([
    ["empty", ""],
    ["too short", valid.slice(1)],
    ["too long", `${valid}A`],
    ["base64 + / =", `${"A".repeat(41)}+/`],
    ["padding", `${"A".repeat(42)}=`],
    ["dot", `${"A".repeat(42)}.`],
    ["non-string", 42],
    ["undefined", undefined],
  ])("%s → invalid, no query", async (_name, token) => {
    await expect(resolveSignerToken(token)).resolves.toEqual({ ok: false, reason: "invalid" });
    expect(findUnique).not.toHaveBeenCalled();
  });

  it("looks up a well-formed token by its HMAC, never the raw value", async () => {
    findUnique.mockResolvedValue(null);
    await expect(resolveSignerToken(valid)).resolves.toEqual({ ok: false, reason: "invalid" });
    const where = findUnique.mock.calls[0][0].where;
    expect(where).toEqual({ tokenHash: hashSignerToken(valid) });
    expect(JSON.stringify(findUnique.mock.calls)).not.toContain(valid);
  });

  it("never logs the token", async () => {
    findUnique.mockResolvedValue(null);
    await resolveSignerToken(valid);
    const logged = JSON.stringify([...vi.mocked(console.warn).mock.calls, ...vi.mocked(console.info).mock.calls]);
    expect(logged).toContain("signer_link_rejected");
    expect(logged).not.toContain(valid);
  });

  it("sequential: not_your_turn while an earlier signer hasn't signed", async () => {
    findUnique.mockResolvedValue({
      ...signer,
      tokenHash: hashSignerToken(valid),
      document: { ...document, signingOrder: "SEQUENTIAL" },
    });
    count.mockResolvedValue(1);
    await expect(resolveSignerToken(valid, NOW)).resolves.toEqual({ ok: false, reason: "not_your_turn" });
    expect(count.mock.calls[0][0].where).toEqual({ documentId: DOC_ID, order: { lt: 2 }, status: { not: "SIGNED" } });
  });
});

describe("evaluateSignerAccess", () => {
  it("allows a pending signer on a SENT or PARTIALLY_SIGNED document", () => {
    expect(evaluateSignerAccess(signer, document, NOW)).toBeNull();
    expect(evaluateSignerAccess(signer, { ...document, status: "PARTIALLY_SIGNED" }, NOW)).toBeNull();
    expect(evaluateSignerAccess({ ...signer, status: "VIEWED" }, { ...document, expiresAt: null }, NOW)).toBeNull();
  });

  it.each([
    ["draft", signer, { ...document, status: "DRAFT" as const }],
    ["completed", signer, { ...document, status: "COMPLETED" as const }],
    ["declined document", signer, { ...document, status: "DECLINED" as const }],
    ["expired status", signer, { ...document, status: "EXPIRED" as const }],
    ["voided status", signer, { ...document, status: "VOIDED" as const }],
    ["voidedAt set", signer, { ...document, voidedAt: NOW }],
    ["deleted", signer, { ...document, deletedAt: NOW }],
    ["past expiresAt", signer, { ...document, expiresAt: new Date(NOW.getTime() - 1) }],
    ["signer signed", { ...signer, status: "SIGNED" as const, signedAt: NOW }, document],
    ["signer declined", { ...signer, status: "DECLINED" as const, declinedAt: NOW }, document],
    ["signedAt without status", { ...signer, signedAt: NOW }, document],
    ["other document", { ...signer, documentId: "0192f0c4-0000-7000-8000-0000000000ff" }, document],
  ])("denies: %s", (_name, s, d) => {
    expect(evaluateSignerAccess(s, d, NOW)).not.toBeNull();
  });
});
