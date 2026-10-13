import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import {
  INTEGRATION_WARNING,
  assertSafeForIntegrationTests,
  integrationSkipReason,
  resetPlatformSignTables,
} from "@/platform/db/test-support/integration-db";
import { createSignFixture, TEST_SESSION_SECRET, TEST_TOKEN_PEPPER } from "@/modules/sign/test-support/sign-fixtures";

/**
 * End to end against DATABASE_URL: email link → exchange route (cookie + OPENED) → signer OTP
 * (OTP_SENT, OTP_VERIFIED) → hash-chained audit trail. Also proves the link token never
 * reaches logs or audit evidence.
 */

const SKIP_REASON = integrationSkipReason();
if (SKIP_REASON) {
  console.warn(`[signer-flow.integration] SKIPPED: ${SKIP_REASON}`);
} else {
  assertSafeForIntegrationTests();
  console.warn(`[signer-flow.integration] ${INTEGRATION_WARNING}`);
}

const sentCodes: { to: string; code: string }[] = [];
vi.mock("@/platform/email", () => ({
  sendOtpEmail: async (input: { to: string; code: string }) => {
    sentCodes.push({ to: input.to, code: input.code });
  },
}));
// Never hit a real Upstash from tests; the limiter itself is covered by its own suite.
vi.mock("@/platform/rate-limit", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/platform/rate-limit")>();
  return { ...actual, consumePlatformRateLimit: async () => ({ allowed: true, remaining: 1, retryAfterSec: 1 }) };
});

const RUN = `sgn-flow-${Date.now()}`;

describe.skipIf(Boolean(SKIP_REASON))("signer flow (DATABASE_URL)", () => {
  let prisma: Awaited<typeof import("@/platform/db")>["prisma"];
  let logLines: string[];

  beforeAll(async () => {
    vi.stubEnv("TOKEN_PEPPER", TEST_TOKEN_PEPPER);
    vi.stubEnv("SESSION_SECRET", TEST_SESSION_SECRET);
    ({ prisma } = await import("@/platform/db"));
    await resetPlatformSignTables(prisma);
  }, 60_000);

  beforeEach(() => {
    vi.stubEnv("SIGN_APP_ENABLED", "true");
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("TOKEN_PEPPER", TEST_TOKEN_PEPPER);
    vi.stubEnv("SESSION_SECRET", TEST_SESSION_SECRET);
    logLines = [];
    for (const level of ["info", "warn", "error", "log", "debug"] as const) {
      vi.spyOn(console, level).mockImplementation((...args: unknown[]) => {
        logLines.push(args.map((a) => (typeof a === "string" ? a : JSON.stringify(a))).join(" "));
      });
    }
  });

  afterAll(async () => {
    vi.restoreAllMocks();
    if (prisma) await resetPlatformSignTables(prisma);
  });

  async function exchange(rawToken: string, cookie?: string) {
    const { GET } = await import("@/app/tools/sign/(signer)/s/[token]/route");
    return GET(
      new NextRequest(`https://www.karmakoders.com/tools/sign/s/${rawToken}`, {
        headers: { "x-forwarded-for": "203.0.113.7", "user-agent": "Vitest UA", ...(cookie ? { cookie } : {}) },
      }),
      { params: Promise.resolve({ token: rawToken }) }
    );
  }

  function cookieFrom(res: Response): string {
    const match = /^kk_signer=([^;]+);/.exec(res.headers.get("set-cookie") ?? "");
    expect(match).not.toBeNull();
    return match![1];
  }

  async function signerContext(cookie: string) {
    const { loadSignerSession } = await import("./signer-session");
    const context = await loadSignerSession(cookie);
    expect(context).not.toBeNull();
    return context!;
  }

  it("valid link → cookie + 303 to a clean URL + OPENED (actor SIGNER, ip, user agent)", async () => {
    const { signers, document } = await createSignFixture(prisma, { run: RUN });
    const res = await exchange(signers[0].rawToken);

    expect(res.status).toBe(303);
    expect(new URL(res.headers.get("location")!).pathname).toBe("/tools/sign/sign");
    expect(res.headers.get("location")).not.toContain(signers[0].rawToken);
    expect(res.headers.get("referrer-policy")).toBe("no-referrer");
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(res.headers.get("x-robots-tag")).toBe("noindex, nofollow");

    const context = await signerContext(cookieFrom(res));
    expect(context.signer.id).toBe(signers[0].row.id);

    const events = await prisma.signAuditEvent.findMany({ where: { documentId: document.id } });
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      type: "OPENED",
      actorType: "SIGNER",
      signerId: signers[0].row.id,
      ip: "203.0.113.7",
      userAgent: "Vitest UA",
      sequence: 1,
      prevHash: null,
    });
  });

  it("invalid and voided links → 303 to the invalid page, no cookie, no audit event", async () => {
    const { signers, document } = await createSignFixture(prisma, { run: RUN, status: "VOIDED" });
    for (const token of [signers[0].rawToken, "y".repeat(43), "short"]) {
      const res = await exchange(token);
      expect(res.status).toBe(303);
      expect(new URL(res.headers.get("location")!).pathname).toBe("/tools/sign/s/invalid");
      expect(res.headers.get("set-cookie")).toBeNull();
    }
    expect(await prisma.signAuditEvent.count({ where: { documentId: document.id } })).toBe(0);
  });

  it("OTP: correct code sets otpVerifiedAt and appends OTP_VERIFIED; the chain is valid", async () => {
    const { signers, document } = await createSignFixture(prisma, { run: RUN });
    const context = await signerContext(cookieFrom(await exchange(signers[0].rawToken)));
    const { requestSignerOtp, verifySignerOtp } = await import("./signer-otp");

    await requestSignerOtp(context, { ip: "203.0.113.7", userAgent: "Vitest UA" });
    const sent = sentCodes.at(-1)!;
    expect(sent.to).toBe(signers[0].row.email);
    const challenge = await prisma.platformOtp.findFirstOrThrow({ where: { signerId: signers[0].row.id } });
    expect(challenge.purpose).toBe("SIGNER");

    await expect(verifySignerOtp(context, sent.code, { ip: "203.0.113.7" })).resolves.toMatchObject({
      firstVerification: true,
    });

    const signer = await prisma.signSigner.findUniqueOrThrow({ where: { id: signers[0].row.id } });
    expect(signer.otpVerifiedAt).not.toBeNull();
    // A signer OTP never creates a customer or a kk_session.
    expect(await prisma.platformCustomer.count({ where: { email: signers[0].row.email } })).toBe(0);

    const { verifyAuditChain } = await import("@/platform/audit");
    const events = await prisma.signAuditEvent.findMany({ where: { documentId: document.id }, orderBy: { sequence: "asc" } });
    expect(events.map((e) => [e.sequence, e.type])).toEqual([
      [1, "OPENED"],
      [2, "OTP_SENT"],
      [3, "OTP_VERIFIED"],
    ]);
    expect(events[1].prevHash).toBe(events[0].hash);
    expect(events[2].prevHash).toBe(events[1].hash);
    expect(verifyAuditChain(events)).toBe(true);
  });

  it("OTP: a wrong code increments attempts and changes nothing else", async () => {
    const { signers, document } = await createSignFixture(prisma, { run: RUN });
    const context = await signerContext(cookieFrom(await exchange(signers[0].rawToken)));
    const { requestSignerOtp, verifySignerOtp } = await import("./signer-otp");
    const { OTP_INVALID_MESSAGE } = await import("@/platform/auth/otp");

    await requestSignerOtp(context);
    const code = sentCodes.at(-1)!.code;
    const wrong = code === "000000" ? "111111" : "000000";
    await expect(verifySignerOtp(context, wrong)).rejects.toThrow(OTP_INVALID_MESSAGE);

    const challenge = await prisma.platformOtp.findFirstOrThrow({ where: { signerId: signers[0].row.id } });
    expect(challenge.attempts).toBe(1);
    expect(challenge.consumedAt).toBeNull();
    expect((await prisma.signSigner.findUniqueOrThrow({ where: { id: signers[0].row.id } })).otpVerifiedAt).toBeNull();
    expect(await prisma.signAuditEvent.count({ where: { documentId: document.id, type: "OTP_VERIFIED" } })).toBe(0);
  });

  it("OTP: concurrent correct verifies record exactly one OTP_VERIFIED", async () => {
    const { signers, document } = await createSignFixture(prisma, { run: RUN });
    const context = await signerContext(cookieFrom(await exchange(signers[0].rawToken)));
    const { requestSignerOtp, verifySignerOtp } = await import("./signer-otp");

    await requestSignerOtp(context);
    const code = sentCodes.at(-1)!.code;
    const results = await Promise.allSettled([1, 2, 3].map(() => verifySignerOtp(context, code)));

    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(await prisma.signAuditEvent.count({ where: { documentId: document.id, type: "OTP_VERIFIED" } })).toBe(1);
    const { verifyAuditChain } = await import("@/platform/audit");
    expect(verifyAuditChain(await prisma.signAuditEvent.findMany({ where: { documentId: document.id } }))).toBe(true);
  });

  it("OTP codes are scoped to the signer: the same person on two documents has independent codes", async () => {
    const a = await createSignFixture(prisma, { run: RUN });
    const b = await createSignFixture(prisma, { run: RUN });
    const sharedEmail = `${RUN}-shared@example.test`;
    await prisma.signSigner.update({ where: { id: a.signers[0].row.id }, data: { email: sharedEmail } });
    await prisma.signSigner.update({ where: { id: b.signers[0].row.id }, data: { email: sharedEmail } });
    const ctxA = await signerContext(cookieFrom(await exchange(a.signers[0].rawToken)));
    const ctxB = await signerContext(cookieFrom(await exchange(b.signers[0].rawToken)));
    const { requestSignerOtp, verifySignerOtp } = await import("./signer-otp");

    await requestSignerOtp(ctxA);
    const codeA = sentCodes.at(-1)!.code;
    await requestSignerOtp(ctxB);
    // Requesting B's code did not invalidate A's, and A's code doesn't verify B.
    await expect(verifySignerOtp(ctxA, codeA)).resolves.toMatchObject({ verified: true });
    expect((await prisma.signSigner.findUniqueOrThrow({ where: { id: b.signers[0].row.id } })).otpVerifiedAt).toBeNull();
  });

  it("the link token never appears in logs or audit evidence", async () => {
    const { signers, document } = await createSignFixture(prisma, { run: RUN, signerCount: 2 });
    const token = signers[0].rawToken;

    // A malformed attempt, a successful exchange + OTP, then a replay after void.
    await exchange(token.slice(0, 42));
    const context = await signerContext(cookieFrom(await exchange(token)));
    const { requestSignerOtp, verifySignerOtp } = await import("./signer-otp");
    await requestSignerOtp(context);
    await verifySignerOtp(context, sentCodes.at(-1)!.code);
    await prisma.signDocument.update({ where: { id: document.id }, data: { status: "VOIDED", voidedAt: new Date() } });
    await exchange(token);

    expect(logLines.length).toBeGreaterThan(0);
    for (const line of logLines) {
      expect(line).not.toContain(token);
      expect(line).not.toContain(token.slice(0, 42));
    }
    const evidence = JSON.stringify(await prisma.signAuditEvent.findMany({ where: { documentId: document.id } }));
    expect(evidence).not.toContain(token);
    const sessions = JSON.stringify(await prisma.signSignerSession.findMany({ where: { documentId: document.id } }));
    expect(sessions).not.toContain(token);
  });
});
