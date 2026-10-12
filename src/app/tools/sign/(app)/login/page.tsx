import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentCustomer, safeNextPath } from "@/platform/auth";
import { requireSignAppEnabledPage } from "@/modules/sign/launch/server";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Sign in | KarmaKoders Sign",
  description: "Passwordless email login for KarmaKoders Sign.",
  robots: { index: false, follow: false },
};

type PageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

/** noindex comes from the (app) layout; the launch switch is checked there and here. */
export default async function SignLoginPage({ searchParams }: PageProps) {
  requireSignAppEnabledPage();
  const raw = (await searchParams).next;
  const next = safeNextPath(typeof raw === "string" ? raw : undefined);

  // Already signed in: go straight to the destination (dashboard by default).
  if (await getCurrentCustomer()) redirect(next);

  return (
    <div className="mx-auto max-w-md space-y-8">
      <div className="space-y-3">
        <p className="text-sm font-bold uppercase tracking-widest text-[#FFC300]">KarmaKoders Sign</p>
        <h1 className="text-3xl font-black tracking-tight text-white">Sign in</h1>
        <p className="leading-relaxed text-[#A39F97]">No password needed. We&apos;ll email you a one-time code.</p>
      </div>
      <LoginForm next={next} />
    </div>
  );
}
