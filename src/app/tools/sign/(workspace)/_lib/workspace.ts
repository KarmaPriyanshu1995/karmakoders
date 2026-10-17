import "server-only";

import { getCustomerProfile, requireCustomer, type CustomerProfile, type CustomerSession } from "@/platform/auth";
import { getFreeSignUsage } from "@/platform/billing/usage";
import { requireSignAppEnabledPage } from "@/modules/sign/launch/server";
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
 * profile (email, credits, subscriptions, free sends this month) as a plan summary.
 * Real routes never use fixtures: data that isn't wired yet renders the screen's empty state.
 */
export async function loadWorkspace(path: string): Promise<WorkspaceContext> {
  requireSignAppEnabledPage();
  const session = await requireCustomer({ redirectToLoginFrom: path });
  const [profile, freeUsed] = await Promise.all([
    getCustomerProfile(session.customer.id),
    getFreeSignUsage(session.customer.id),
  ]);
  const plan = planSummaryFrom(profile, { freeUsed });
  return { session, profile, plan };
}

export const WORKSPACE_ROBOTS = { index: false, follow: false } as const;
