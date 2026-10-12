import type { Metadata } from "next";
import { Button } from "@/components/product-ui";
import { getCustomerProfile, requireCustomer } from "@/platform/auth";
import { activePlanName } from "@/platform/billing/plans";
import { logoutAction, logoutAllAction } from "./actions";

export const metadata: Metadata = {
  title: "Dashboard | KarmaKoders Sign",
  robots: { index: false, follow: false },
};

/** Placeholder dashboard (the real one comes later). Launch switch + noindex from the (app) layout. */
export default async function SignDashboardPage() {
  const { customer } = await requireCustomer({ redirectToLoginFrom: "/tools/sign/dashboard" });
  const profile = await getCustomerProfile(customer.id);

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-black tracking-tight text-white">Dashboard</h1>

      <dl className="grid max-w-xl gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-white/10 bg-[#1C1B1A] p-4">
          <dt className="text-xs uppercase tracking-wide text-[#A39F97]">Email</dt>
          <dd className="mt-1 break-all text-white">{profile.email}</dd>
        </div>
        <div className="rounded-xl border border-white/10 bg-[#1C1B1A] p-4">
          <dt className="text-xs uppercase tracking-wide text-[#A39F97]">Credits</dt>
          <dd className="mt-1 text-2xl font-bold text-white">{profile.creditsBalance}</dd>
        </div>
        <div className="rounded-xl border border-white/10 bg-[#1C1B1A] p-4">
          <dt className="text-xs uppercase tracking-wide text-[#A39F97]">Plan</dt>
          <dd className="mt-1 text-white">{activePlanName(profile.subscriptions)}</dd>
        </div>
      </dl>

      <div className="flex flex-wrap gap-3">
        <form action={logoutAction}>
          <Button type="submit" variant="outline">
            Log out
          </Button>
        </form>
        <form action={logoutAllAction}>
          <Button type="submit" variant="ghost">
            Log out of all devices
          </Button>
        </form>
      </div>
    </div>
  );
}
