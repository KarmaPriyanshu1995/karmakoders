import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCustomerSession } from "@/platform/auth";
import { requireSignAppEnabledPage } from "@/modules/sign/launch/server";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Sign in | KarmaKoders Sign",
  description: "Passwordless email login for KarmaKoders Sign.",
  alternates: { canonical: "https://www.karmakoders.com/tools/sign/login" },
  robots: { index: false, follow: false },
};

export default async function SignLoginPage() {
  requireSignAppEnabledPage();
  const session = await getCustomerSession();
  if (session) {
    redirect("/tools/sign/dashboard");
  }

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <p className="text-[#FFC300] text-sm font-bold uppercase tracking-widest">
          KarmaKoders Sign
        </p>
        <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white">
          Sign in with email
        </h1>
        <p className="text-[#A39F97] max-w-lg leading-relaxed">
          We&apos;ll send a one-time code. No password to remember.
        </p>
      </div>
      <LoginForm />
    </div>
  );
}
