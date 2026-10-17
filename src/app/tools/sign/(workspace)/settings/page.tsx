import type { Metadata } from "next";
import { listCustomerSessions } from "@/platform/auth";
import { SettingsScreen } from "@/modules/sign/ui/screens/settings-screen";
import { logoutAllAction } from "../dashboard/actions";
import { WORKSPACE_ROBOTS, loadWorkspace } from "../_lib/workspace";

export const metadata: Metadata = {
  title: "Settings | KarmaKoders Sign",
  robots: WORKSPACE_ROBOTS,
};

/** Real profile and signed-in devices. TODO(Step 10): save branding. TODO(Step 7): edit the name. */
export default async function SignSettingsPage() {
  const { session, profile, plan } = await loadWorkspace("/tools/sign/settings");
  const sessions = await listCustomerSessions(session.customer.id, session.sessionId);
  return (
    <SettingsScreen
      vm={{ profile: { name: profile.name, email: profile.email }, plan, sessions }}
      logoutAllAction={logoutAllAction}
    />
  );
}
