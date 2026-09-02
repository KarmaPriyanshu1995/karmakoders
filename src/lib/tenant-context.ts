import "server-only";
import { cache } from "react";
import { prisma } from "@/lib/prisma";

/** Resolves the platform's primary/default tenant for public pages and unscoped actions. */
export const getPrimaryTenantId = cache(async (): Promise<string> => {
  const primary = await prisma.tenant.findFirst({
    where: { isPrimary: true },
    select: { id: true },
  });
  if (primary) return primary.id;

  const fallback = await prisma.tenant.findFirst({
    where: { status: "ACTIVE" },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  if (fallback) return fallback.id;

  throw new Error("No tenant exists yet. Run npx prisma db seed.");
});

/** Tenant for server actions callable from public pages and admin alike. */
export async function getContextualTenantId(): Promise<string> {
  return getPrimaryTenantId();
}
