import "server-only";

import { z } from "zod";
import { prisma, withDbRetry } from "@/platform/db";
import { PlatformError } from "@/platform/errors";

/** Subscription statuses that grant access (shown as "active" to the customer). */
export const ACTIVE_SUBSCRIPTION_STATUSES = ["ACTIVE", "TRIALING"] as const;

/**
 * Public shape of GET /api/platform/auth/me. Parsed (not just typed) so unknown or internal
 * fields — token/code hashes, Paddle ids, session data — can never leak, even if the query
 * selects more later. zod objects strip unknown keys by default.
 */
export const customerProfileSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string().nullable(),
  creditsBalance: z.number().int(),
  subscriptions: z.array(
    z.object({
      product: z.enum(["SIGN_PRO", "ALL_ACCESS"]),
      interval: z.enum(["MONTH", "YEAR"]),
      status: z.enum(ACTIVE_SUBSCRIPTION_STATUSES),
      currentPeriodEnd: z.string().nullable(),
    })
  ),
});

export type CustomerProfile = z.infer<typeof customerProfileSchema>;

export async function getCustomerProfile(customerId: string): Promise<CustomerProfile> {
  const customer = await withDbRetry(() =>
    prisma.platformCustomer.findUnique({
      where: { id: customerId },
      select: {
        id: true,
        email: true,
        name: true,
        creditsBalance: true,
        subscriptions: {
          where: { status: { in: [...ACTIVE_SUBSCRIPTION_STATUSES] } },
          select: { product: true, interval: true, status: true, currentPeriodEnd: true },
          orderBy: { createdAt: "desc" },
        },
      },
    })
  );
  if (!customer) throw new PlatformError("unauthorized", "Sign in required");

  return customerProfileSchema.parse({
    ...customer,
    subscriptions: customer.subscriptions.map((s) => ({
      ...s,
      currentPeriodEnd: s.currentPeriodEnd ? s.currentPeriodEnd.toISOString() : null,
    })),
  });
}
