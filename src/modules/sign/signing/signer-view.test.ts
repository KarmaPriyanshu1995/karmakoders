import { afterEach, describe, expect, it, vi } from "vitest";

const findUnique = vi.fn();
vi.mock("@/platform/db", () => ({
  prisma: { signDocument: { findUnique: (...args: unknown[]) => findUnique(...args) } },
  withDbRetry: <T>(fn: () => Promise<T>) => fn(),
}));

const { getSignerPageDetails, parseBrandingSnapshot } = await import("./signer-view");

const context = {
  sessionId: "sess-1",
  signer: {
    id: "sig-1",
    documentId: "doc-1",
    name: "Riley Real",
    email: "riley@example.com",
    order: 1,
    status: "VIEWED" as const,
    signedAt: null,
    declinedAt: null,
    otpVerifiedAt: null,
  },
  document: {
    id: "doc-1",
    title: "Lease",
    status: "SENT" as const,
    signingOrder: "PARALLEL" as const,
    expiresAt: null,
    voidedAt: null,
    deletedAt: null,
  },
};

afterEach(() => vi.clearAllMocks());

describe("parseBrandingSnapshot", () => {
  it("keeps only a non-empty company name", () => {
    expect(parseBrandingSnapshot({ companyName: " Acme ", logoFileId: "x", primaryColor: "#000" })).toEqual({ companyName: "Acme" });
    expect(parseBrandingSnapshot({ companyName: "" })).toEqual({ companyName: null });
    expect(parseBrandingSnapshot(null)).toEqual({ companyName: null });
    expect(parseBrandingSnapshot("Acme")).toEqual({ companyName: null });
    expect(parseBrandingSnapshot({ companyName: "x".repeat(121) })).toEqual({ companyName: null });
  });
});

describe("getSignerPageDetails", () => {
  it("reads only display fields of the session's own document and masks the email", async () => {
    findUnique.mockResolvedValueOnce({ message: "  Please sign  ", brandingSnapshot: { companyName: "Acme" }, owner: { name: "Sam" } });
    const vm = await getSignerPageDetails(context);
    expect(findUnique).toHaveBeenCalledWith({
      where: { id: "doc-1" },
      select: { message: true, brandingSnapshot: true, owner: { select: { name: true } } },
    });
    expect(vm).toEqual({
      documentTitle: "Lease",
      senderName: "Acme",
      brand: { companyName: "Acme", logoUrl: null },
      signerName: "Riley Real",
      maskedEmail: "r***@example.com",
      message: "Please sign",
    });
  });

  it("falls back to the sender's name, then to nothing", async () => {
    findUnique.mockResolvedValueOnce({ message: null, brandingSnapshot: null, owner: { name: "Sam Sender" } });
    expect((await getSignerPageDetails(context)).senderName).toBe("Sam Sender");
    findUnique.mockResolvedValueOnce({ message: "", brandingSnapshot: null, owner: { name: null } });
    const vm = await getSignerPageDetails(context);
    expect(vm.senderName).toBeNull();
    expect(vm.message).toBeNull();
    expect(vm.brand.companyName).toBeNull();
  });
});
