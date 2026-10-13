import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import {
  INTEGRATION_WARNING,
  assertSafeForIntegrationTests,
  integrationSkipReason,
  resetPlatformSignTables,
} from "@/platform/db/test-support/integration-db";
import { createSignFixture, TEST_SESSION_SECRET, TEST_TOKEN_PEPPER } from "@/modules/sign/test-support/sign-fixtures";

/** Signer sessions (kk_signer) against DATABASE_URL (Neon dev branch / CI postgres). */

const SKIP_REASON = integrationSkipReason();
if (SKIP_REASON) {
  console.warn(`[signer-session.integration] SKIPPED: ${SKIP_REASON}`);
} else {
  assertSafeForIntegrationTests();
  console.warn(`[signer-session.integration] ${INTEGRATION_WARNING}`);
}

let cookieValue: string | undefined;
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (cookieValue && name === "kk_signer" ? { name, value: cookieValue } : undefined),
    set: () => undefined,
  }),
}));

const RUN = `sgn-sess-${Date.now()}`;

describe.skipIf(Boolean(SKIP_REASON))("signer sessions (DATABASE_URL)", () => {
  let prisma: Awaited<typeof import("@/platform/db")>["prisma"];

  beforeAll(async () => {
    ({ prisma } = await import("@/platform/db"));
    await resetPlatformSignTables(prisma);
  }, 60_000);

  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("TOKEN_PEPPER", TEST_TOKEN_PEPPER);
    vi.stubEnv("SESSION_SECRET", TEST_SESSION_SECRET);
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    cookieValue = undefined;
  });

  afterAll(async () => {
    if (prisma) await resetPlatformSignTables(prisma);
  });

  async function openSession(options: Omit<Parameters<typeof createSignFixture>[1], "run"> = {}) {
    const fixture = await createSignFixture(prisma, { run: RUN, ...options });
    const { startSignerSession } = await import("./signer-session");
    const session = await startSignerSession({
      signerId: fixture.signers[0].row.id,
      documentId: fixture.document.id,
      ip: "203.0.113.7",
      userAgent: "Vitest UA",
    });
    return { ...fixture, session };
  }

  it("stores only the HMAC of the cookie value, bound to signer and document", async () => {
    const { session, signers, document } = await openSession();
    const row = await prisma.signSignerSession.findFirstOrThrow({ where: { signerId: signers[0].row.id } });
    expect(row.documentId).toBe(document.id);
    expect(row.tokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(JSON.stringify(row)).not.toContain(session.rawToken);
    const ttl = row.expiresAt.getTime() - row.createdAt.getTime();
    expect(ttl).toBeGreaterThan(2 * 60 * 60 * 1000 - 5000);
    expect(ttl).toBeLessThanOrEqual(2 * 60 * 60 * 1000 + 5000);
  });

  it("requireSigner accepts a valid cookie", async () => {
    const { session, signers, document } = await openSession();
    cookieValue = session.rawToken;
    const { requireSigner } = await import("./signer-session");
    const context = await requireSigner();
    expect(context.signer.id).toBe(signers[0].row.id);
    expect(context.document.id).toBe(document.id);
    expect(await requireSigner({ documentId: document.id })).toMatchObject({ document: { id: document.id } });
  });

  it("requireSigner rejects a missing cookie with 401", async () => {
    const { requireSigner } = await import("./signer-session");
    await expect(requireSigner()).rejects.toMatchObject({ status: 401 });
  });

  it("rejects a tampered cookie (wrong value or wrong format)", async () => {
    const { session } = await openSession();
    const { loadSignerSession, requireSigner } = await import("./signer-session");
    const flipped = `${session.rawToken.slice(0, -1)}${session.rawToken.endsWith("A") ? "B" : "A"}`;
    expect(await loadSignerSession(flipped)).toBeNull();
    expect(await loadSignerSession(`${session.rawToken}x`)).toBeNull();
    expect(await loadSignerSession("../../etc")).toBeNull();
    cookieValue = flipped;
    await expect(requireSigner()).rejects.toMatchObject({ status: 401 });
  });

  it("rejects an expired session (2-hour lifetime) and a revoked one", async () => {
    const { session } = await openSession();
    const { loadSignerSession } = await import("./signer-session");
    expect(await loadSignerSession(session.rawToken)).not.toBeNull();
    expect(await loadSignerSession(session.rawToken, new Date(Date.now() + 2 * 60 * 60 * 1000 + 1000))).toBeNull();

    const { hashSignerSessionToken } = await import("@/platform/auth/crypto");
    await prisma.signSignerSession.update({
      where: { tokenHash: hashSignerSessionToken(session.rawToken) },
      data: { revokedAt: new Date() },
    });
    expect(await loadSignerSession(session.rawToken)).toBeNull();
  });

  it("rejects a session whose document was voided after the cookie was issued", async () => {
    const { session, document } = await openSession();
    cookieValue = session.rawToken;
    const { requireSigner, loadSignerSession } = await import("./signer-session");
    await expect(requireSigner()).resolves.toBeDefined();

    await prisma.signDocument.update({ where: { id: document.id }, data: { status: "VOIDED", voidedAt: new Date() } });
    expect(await loadSignerSession(session.rawToken)).toBeNull();
    vi.resetModules();
    const fresh = await import("./signer-session");
    await expect(fresh.requireSigner()).rejects.toMatchObject({ status: 401 });
  });

  it("rejects a session after the signer has signed, or the document expired or was deleted", async () => {
    const { loadSignerSession } = await import("./signer-session");

    const signed = await openSession();
    await prisma.signSigner.update({ where: { id: signed.signers[0].row.id }, data: { status: "SIGNED", signedAt: new Date() } });
    expect(await loadSignerSession(signed.session.rawToken)).toBeNull();

    const expired = await openSession();
    await prisma.signDocument.update({ where: { id: expired.document.id }, data: { expiresAt: new Date(Date.now() - 1000) } });
    expect(await loadSignerSession(expired.session.rawToken)).toBeNull();

    const deleted = await openSession();
    await prisma.signDocument.update({ where: { id: deleted.document.id }, data: { deletedAt: new Date() } });
    expect(await loadSignerSession(deleted.session.rawToken)).toBeNull();
  });

  it("a signer cookie for document A cannot access document B", async () => {
    const a = await openSession();
    const b = await openSession();
    cookieValue = a.session.rawToken;
    const { requireSigner } = await import("./signer-session");
    await expect(requireSigner({ documentId: a.document.id })).resolves.toBeDefined();
    await expect(requireSigner({ documentId: b.document.id })).rejects.toMatchObject({ status: 401 });
  });

  it("a new exchange in the same browser replaces (revokes) the previous signer session", async () => {
    const first = await openSession();
    const second = await createSignFixture(prisma, { run: RUN });
    const { startSignerSession, loadSignerSession } = await import("./signer-session");

    const next = await startSignerSession({
      signerId: second.signers[0].row.id,
      documentId: second.document.id,
      previousRawToken: first.session.rawToken,
    });

    expect(await loadSignerSession(first.session.rawToken)).toBeNull();
    expect((await loadSignerSession(next.rawToken))?.document.id).toBe(second.document.id);
  });
});
