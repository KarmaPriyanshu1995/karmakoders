import "server-only";

import { getCustomerProfile, requireCustomer, type CustomerProfile, type CustomerSession } from "@/platform/auth";
import { requireSignAppEnabledPage } from "@/modules/sign/launch/server";
import { FIXTURE_FREE_USED } from "@/modules/sign/ui/fixtures/plans";
import { planSummaryFrom } from "@/modules/sign/ui/screens/plan-summary";
import type { PlanSummaryVM } from "@/modules/sign/ui/view-models";

export type WorkspaceContext = {
  session: CustomerSession;
  profile: CustomerProfile;
  plan: PlanSummaryVM;
};

/**
 * Every logged-in Sign page starts here: launch switch (404 while SIGN_APP_ENABLED is off),
 * a signed-in customer (otherwise redirect to login with `next` = this page), and the real
 * profile (email, credits, subscriptions) as a plan summary.
 */
export async function loadWorkspace(path: string): Promise<WorkspaceContext> {
  requireSignAppEnabledPage();
  const session = await requireCustomer({ redirectToLoginFrom: path });
  const profile = await getCustomerProfile(session.customer.id);
  // TODO(Step 10): free sends used this month come from PlatformUsage.
  const plan = planSummaryFrom(profile, { freeUsed: FIXTURE_FREE_USED });
  return { session, profile, plan };
}

export const WORKSPACE_ROBOTS = { index: false, follow: false } as const;
