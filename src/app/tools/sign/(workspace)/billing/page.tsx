import type { Metadata } from "next";
import { PURCHASE_FIXTURES } from "@/modules/sign/ui/fixtures/screens";
import { billingOffers } from "@/modules/sign/ui/screens/billing-offers";
import { BillingScreen } from "@/modules/sign/ui/screens/billing-screen";
import { WORKSPACE_ROBOTS, loadWorkspace } from "../_lib/workspace";

export const metadata: Metadata = {
  title: "Billing | KarmaKoders Sign",
  robots: WORKSPACE_ROBOTS,
};

/** Real balance and plan; prices from plans.ts. TODO(Step 10): purchases from Paddle, checkout and portal. */
export default async function SignBillingPage() {
  const { plan } = await loadWorkspace("/tools/sign/billing");
  return <BillingScreen vm={{ plan, ...billingOffers(plan), purchases: PURCHASE_FIXTURES }} />;
}
