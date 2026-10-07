import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCustomerSession } from "@/platform/auth";
import { getTemplateBySlug } from "@/modules/sign/templates";
import { LegalDisclaimer } from "@/modules/sign/ui";

export const metadata: Metadata = {
  title: "New document | KarmaKoders Sign",
  robots: { index: false, follow: false },
};

type PageProps = { params: Promise<{ template: string }> };

/** Compose stub — sign-in gated. The real compose flow replaces this in Step 4. */
export default async function SignComposePage({ params }: PageProps) {
  const { template: slug } = await params;
  const template = getTemplateBySlug(slug);
  if (!template) notFound();

  const session = await getCustomerSession();
  if (!session) redirect("/tools/sign/login");

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-black tracking-tight">New {template.name}</h1>
      <p className="max-w-xl text-[#A39F97]">
        Document compose ships in the next release. Your template choice is ready when it does.
      </p>
      <Link href="/tools/sign/templates" className="text-sm text-[#FFC300] underline-offset-4 hover:underline">
        Back to templates
      </Link>
      <LegalDisclaimer />
    </div>
  );
}
