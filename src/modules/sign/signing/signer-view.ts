import "server-only";

import { z } from "zod";
import { prisma, withDbRetry } from "@/platform/db";
import { maskEmail } from "@/platform/logger";
import type { SignerContextVM } from "@/modules/sign/ui/signer-view-models";
import type { SignerContext } from "./signer-session";

/**
 * What the signer pages show about a document, for a signer whose session has already been
 * validated (getCurrentSigner). Read-only: never changes document or signer state. Returns only
 * whitelisted, display-safe fields: never the token, hashes, field values or document content.
 */

/** brandingSnapshot is JSON written at send; only the company name is shown to signers. */
const brandingSnapshotSchema = z
  .object({ companyName: z.string().trim().min(1).max(120).nullish() })
  .nullish();

export function parseBrandingSnapshot(value: unknown): { companyName: string | null } {
  const parsed = brandingSnapshotSchema.safeParse(value);
  return { companyName: (parsed.success && parsed.data?.companyName) || null };
}

export async function getSignerPageDetails(context: SignerContext): Promise<SignerContextVM> {
  const row = await withDbRetry(() =>
    prisma.signDocument.findUnique({
      where: { id: context.document.id },
      select: { message: true, brandingSnapshot: true, owner: { select: { name: true } } },
    })
  );
  const { companyName } = parseBrandingSnapshot(row?.brandingSnapshot);
  const ownerName = row?.owner.name?.trim() || null;
  return {
    documentTitle: context.document.title,
    senderName: companyName ?? ownerName,
    // TODO(Step 10): logo from brandingSnapshot via a signer-scoped R2 URL.
    brand: { companyName, logoUrl: null },
    signerName: context.signer.name,
    maskedEmail: maskEmail(context.signer.email),
    message: row?.message?.trim() || null,
  };
}
