import { describe, expect, it, vi } from "vitest";

const $transaction = vi.fn();
vi.mock("@/platform/db", () => ({
  prisma: { $transaction: (...a: unknown[]) => $transaction(...a) },
  withDbRetry: <T,>(fn: () => Promise<T>) => fn(),
}));

const { appendAuditEvent, canonicalJson, computeAuditHash, verifyAuditChain, AuditMetadataError } = await import(
  "@/platform/audit"
);

const DOC = "0192f0c4-0000-7000-8000-000000000001";

function chain(length: number) {
  const events = [];
  let prevHash: string | null = null;
  for (let sequence = 1; sequence <= length; sequence++) {
    const fields = {
      documentId: DOC,
      signerId: null,
      type: "OPENED",
      actorType: "SIGNER",
      ip: "203.0.113.7",
      userAgent: "UA",
      metadata: { step: sequence },
      occurredAt: new Date(Date.UTC(2026, 9, 12, 9, 0, sequence)),
      sequence,
      prevHash,
    };
    const hash = computeAuditHash(fields);
    events.push({ ...fields, hash });
    prevHash = hash;
  }
  return events;
}

describe("canonicalJson", () => {
  it("sorts keys recursively, so key order never changes the hash", () => {
    expect(canonicalJson({ b: 1, a: { d: 2, c: [3, { f: 1, e: 0 }] } })).toBe(
      '{"a":{"c":[3,{"e":0,"f":1}],"d":2},"b":1}'
    );
  });
});

describe("computeAuditHash / verifyAuditChain", () => {
  it("is a stable SHA-256 hex digest", () => {
    const [event] = chain(1);
    expect(event.hash).toMatch(/^[a-f0-9]{64}$/);
    expect(computeAuditHash({ ...event })).toBe(event.hash);
  });

  it("accepts an intact chain in any order", () => {
    const events = chain(4);
    expect(verifyAuditChain(events)).toBe(true);
    expect(verifyAuditChain([...events].reverse())).toBe(true);
    expect(verifyAuditChain([])).toBe(true);
  });

  it("detects edited fields, broken links, gaps and reordering", () => {
    const events = chain(3);
    expect(verifyAuditChain(events.map((e, i) => (i === 1 ? { ...e, ip: "198.51.100.1" } : e)))).toBe(false);
    expect(verifyAuditChain(events.map((e, i) => (i === 2 ? { ...e, prevHash: "0".repeat(64) } : e)))).toBe(false);
    expect(verifyAuditChain([events[0], events[2]])).toBe(false);
    expect(verifyAuditChain(events.map((e, i) => (i === 0 ? { ...e, metadata: { step: 9 } } : e)))).toBe(false);
  });
});

describe("appendAuditEvent metadata guard", () => {
  it.each(["token", "linkToken", "otpCode", "code", "secret"])("rejects metadata key %s before touching the DB", async (key) => {
    await expect(
      appendAuditEvent({ documentId: DOC, type: "OPENED", actorType: "SIGNER", metadata: { [key]: "x" } })
    ).rejects.toBeInstanceOf(AuditMetadataError);
    expect($transaction).not.toHaveBeenCalled();
  });
});
