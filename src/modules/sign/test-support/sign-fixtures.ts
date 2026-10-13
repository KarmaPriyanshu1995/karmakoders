/**
 * Test-only fixtures for Sign integration tests: a customer, a document and signers with real
 * link tokens (createSignerToken). Never import this from application code.
 */
import type { PrismaClient, SignDocumentStatus, SignSigningOrder } from "@prisma/client";

/** Test secrets (base64 of fixed ASCII strings). */
export const TEST_SESSION_SECRET = "base64:dGVzdF9zZXNzaW9uX3NlY3JldF8zMmJ5dGVzISEhISE=";
export const TEST_TOKEN_PEPPER = "base64:dGVzdF90b2tlbl9wZXBwZXJfMzJieXRlcyEhISEhIQ==";

let counter = 0;

export type SignFixture = Awaited<ReturnType<typeof createSignFixture>>;

export async function createSignFixture(
  prisma: PrismaClient,
  options: {
    run: string;
    status?: SignDocumentStatus;
    signingOrder?: SignSigningOrder;
    signerCount?: number;
    expiresAt?: Date | null;
    ownerId?: string;
  }
) {
  const { createSignerToken } = await import("@/modules/sign/signing/signer-access");
  const { generatePublicId } = await import("@/modules/sign/documents/public-id");
  const n = ++counter;
  const ownerId =
    options.ownerId ??
    (await prisma.platformCustomer.create({ data: { email: `${options.run}-owner-${n}@example.test` } })).id;

  const document = await prisma.signDocument.create({
    data: {
      publicId: generatePublicId(),
      ownerId,
      source: "UPLOAD",
      title: `Fixture document ${n}`,
      status: options.status ?? "SENT",
      signingOrder: options.signingOrder ?? "PARALLEL",
      expiresAt: options.expiresAt === undefined ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) : options.expiresAt,
      sentAt: new Date(),
    },
  });

  const signers = [];
  for (let i = 1; i <= (options.signerCount ?? 1); i++) {
    const { rawToken, tokenHash } = createSignerToken();
    const row = await prisma.signSigner.create({
      data: {
        documentId: document.id,
        name: `Signer ${i}`,
        email: `${options.run}-signer-${n}-${i}@example.test`,
        role: `party_${i}`,
        order: i,
        tokenHash,
      },
    });
    signers.push({ row, rawToken });
  }

  return { ownerId, document, signers };
}
