import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCustomerSession } from "@/platform/auth";
import { LegalDisclaimer } from "@/modules/sign/ui";

export const metadata: Metadata = {
  title: "Upload a PDF | KarmaKoders Sign",
  robots: { index: false, follow: false },
};

/**
 * Upload-your-own-PDF flow (separate from the template catalog by design).
 * Stub — sign-in gated; the real upload + field placement flow replaces this later.
 */
export default async function SignUploadPage() {
  const session = await getCustomerSession();
  if (!session) redirect("/tools/sign/login");

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-black tracking-tight">Upload your own PDF</h1>
      <p className="max-w-xl text-[#A39F97]">
        PDF upload and signature field placement ship in an upcoming release.
      </p>
      <Link href="/tools/sign/templates" className="text-sm text-[#FFC300] underline-offset-4 hover:underline">
        Browse templates instead
      </Link>
      <LegalDisclaimer />
    </div>
  );
}
