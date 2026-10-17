import "server-only";

import { prisma, withDbRetry } from "@/platform/db";
import { freeUsagePeriodKey } from "@/platform/db/sign-status";

/**
 * Free Sign documents the customer has sent this calendar month (UTC), from PlatformUsage.
 * No row means none sent. Read-only: the send step (Step 9) increments it in its transaction.
 */
export async function getFreeSignUsage(customerId: string, now: Date = new Date()): Promise<number> {
  const row = await withDbRetry(() =>
    prisma.platformUsage.findUnique({
      where: { customerId_tool_period: { customerId, tool: "SIGN", period: freeUsagePeriodKey(now) } },
      select: { freeUsed: true },
    })
  );
  return row?.freeUsed ?? 0;
}
