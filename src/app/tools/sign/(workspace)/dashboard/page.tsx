import type { Metadata } from "next";
import { fixtureDashboard } from "@/modules/sign/ui/fixtures/dashboard";
import { DashboardScreen } from "@/modules/sign/ui/screens/dashboard-screen";
import { WORKSPACE_ROBOTS, loadWorkspace } from "../_lib/workspace";

export const metadata: Metadata = {
  title: "Dashboard | KarmaKoders Sign",
  robots: WORKSPACE_ROBOTS,
};

/** Real plan, credits and free usage; documents are fixtures. TODO(Step 7): real documents. */
export default async function SignDashboardPage() {
  const { plan } = await loadWorkspace("/tools/sign/dashboard");
  return <DashboardScreen vm={fixtureDashboard(plan)} />;
}
