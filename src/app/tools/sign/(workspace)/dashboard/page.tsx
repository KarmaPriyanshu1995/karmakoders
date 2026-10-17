import type { Metadata } from "next";
import { DashboardScreen } from "@/modules/sign/ui/screens/dashboard-screen";
import { emptyDashboard } from "@/modules/sign/ui/screens/empty-view-models";
import { WORKSPACE_ROBOTS, loadWorkspace } from "../_lib/workspace";

export const metadata: Metadata = {
  title: "Dashboard | KarmaKoders Sign",
  robots: WORKSPACE_ROBOTS,
};

/**
 * Real plan, credits and free usage. Documents aren't wired yet, so the dashboard shows the
 * first-document guide. TODO(Step 7): counts and recent documents from SignDocument.
 */
export default async function SignDashboardPage() {
  const { plan } = await loadWorkspace("/tools/sign/dashboard");
  return <DashboardScreen vm={emptyDashboard(plan)} />;
}
