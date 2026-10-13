import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import {
  INTEGRATION_WARNING,
  assertSafeForIntegrationTests,
  integrationSkipReason,
  resetPlatformSignTables,
} from "@/platform/db/test-support/integration-db";
import { createSignFixture, TEST_SESSION_SECRET, TEST_TOKEN_PEPPER } from "@/modules/sign/test-support/sign-fixtures";

/** Signer link tokens against DATABASE_URL (Neon dev branch / CI postgres). */

const SKIP_REASON = integrationSkipReason();
if (SKIP_REASON) {
  console.warn(`[signer-access.integration] SKIPPED: ${SKIP_REASON}`);
} else {
  assertSafeForIntegrationTests();
  console.warn(`[signer-access.integration] ${INTEGRATION_WARNING}`);
}

const RUN = `sgn-acc-${Date.now()}`;
const INVALID = { ok: false, reason: "invalid" };

describe.skipIf(Boolean(SKIP_REASON))("resolveSignerToken (DATABASE_URL)", () => {
  let prisma: Awaited<typeof import("@/platform/db")>["prisma"];
  let resolveSignerToken: typeof import("./signer-access").resolveSignerToken;

  beforeAll(async () => {
    vi.stubEnv("TOKEN_PEPPER", TEST_TOKEN_PEPPER);
    vi.stubEnv("SESSION_SECRET", TEST_SESSION_SECRET);
    ({ prisma } = await import("@/platform/db"));
    ({ resolveSignerToken } = await import("./signer-access"));
    await resetPlatformSignTables(prisma);
  }, 60_000);

  beforeEach(() => {
    vi.stubEnv("TOKEN_PEPPER", TEST_TOKEN_PEPPER);
    vi.stubEnv("SESSION_SECRET", TEST_SESSION_SECRET);
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.spyOn(console, "info").mockImplementation(() => undefined);
  });

  afterAll(async () => {
    if (prisma) await resetPlatformSignTables(prisma);
  });

  const fixture = (options: Omit<Parameters<typeof createSignFixture>[1], "run"> = {}) =>
    createSignFixture(prisma, { run: RUN, ...options });

  it("stores only the HMAC of the token, never the raw token", async () => {
    const { signers } = await fixture();
    const { row, rawToken } = signers[0];
    const stored = await prisma.signSigner.findUniqueOrThrow({ where: { id: row.id } });
    expect(stored.tokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(stored.tokenHash).not.toBe(rawToken);
    expect(JSON.stringify(stored)).not.toContain(rawToken);
  });

  it("a valid token resolves to its signer and document", async () => {
    const { signers, document } = await fixture();
    const result = await resolveSignerToken(signers[0].rawToken);
    expect(result).toMatchObject({ ok: true, signer: { id: signers[0].row.id }, document: { id: document.id } });
  });

  it("an unknown well-formed token is invalid", async () => {
    await expect(resolveSignerToken("x".repeat(43))).resolves.toEqual(INVALID);
  });

  it.each([
    ["expired (past expiresAt)", { expiresAt: new Date(Date.now() - 1000) }],
    ["EXPIRED status", { status: "EXPIRED" as const }],
    ["voided", { status: "VOIDED" as const }],
    ["declined document", { status: "DECLINED" as const }],
    ["completed", { status: "COMPLETED" as const }],
    ["draft", { status: "DRAFT" as const }],
  ])("%s → the generic invalid result", async (_name, options) => {
    const { signers } = await fixture(options);
    await expect(resolveSignerToken(signers[0].rawToken)).resolves.toEqual(INVALID);
  });

  it("a soft-deleted document → invalid", async () => {
    const { signers, document } = await fixture();
    await prisma.signDocument.update({ where: { id: document.id }, data: { deletedAt: new Date() } });
    await expect(resolveSignerToken(signers[0].rawToken)).resolves.toEqual(INVALID);
  });

  it("voidedAt set while status still SENT → invalid", async () => {
    const { signers, document } = await fixture();
    await prisma.signDocument.update({ where: { id: document.id }, data: { voidedAt: new Date() } });
    await expect(resolveSignerToken(signers[0].rawToken)).resolves.toEqual(INVALID);
  });

  it("a signer who already signed or declined → invalid (others still valid)", async () => {
    const { signers } = await fixture({ status: "PARTIALLY_SIGNED", signerCount: 3 });
    await prisma.signSigner.update({ where: { id: signers[0].row.id }, data: { status: "SIGNED", signedAt: new Date() } });
    await prisma.signSigner.update({
      where: { id: signers[1].row.id },
      data: { status: "DECLINED", declinedAt: new Date(), declineReason: "no" },
    });
    await expect(resolveSignerToken(signers[0].rawToken)).resolves.toEqual(INVALID);
    await expect(resolveSignerToken(signers[1].rawToken)).resolves.toEqual(INVALID);
    await expect(resolveSignerToken(signers[2].rawToken)).resolves.toMatchObject({ ok: true });
  });

  it("sequential: later signers get not_your_turn until every earlier signer has signed", async () => {
    const { signers } = await fixture({ signingOrder: "SEQUENTIAL", signerCount: 3 });
    const [first, second, third] = signers;

    await expect(resolveSignerToken(first.rawToken)).resolves.toMatchObject({ ok: true });
    await expect(resolveSignerToken(second.rawToken)).resolves.toEqual({ ok: false, reason: "not_your_turn" });
    await expect(resolveSignerToken(third.rawToken)).resolves.toEqual({ ok: false, reason: "not_your_turn" });

    await prisma.signSigner.update({ where: { id: first.row.id }, data: { status: "SIGNED", signedAt: new Date() } });
    await expect(resolveSignerToken(second.rawToken)).resolves.toMatchObject({ ok: true });
    await expect(resolveSignerToken(third.rawToken)).resolves.toEqual({ ok: false, reason: "not_your_turn" });
  });

  it("parallel: every signer's link works at once", async () => {
    const { signers } = await fixture({ signerCount: 3 });
    for (const s of signers) await expect(resolveSignerToken(s.rawToken)).resolves.toMatchObject({ ok: true });
  });

  it("a voided sequential document is invalid, not 'not your turn' (no state is revealed)", async () => {
    const { signers } = await fixture({ signingOrder: "SEQUENTIAL", signerCount: 2, status: "VOIDED" });
    await expect(resolveSignerToken(signers[1].rawToken)).resolves.toEqual(INVALID);
  });
});
