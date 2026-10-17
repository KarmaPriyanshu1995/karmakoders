import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTemplateBySlug } from "@/modules/sign/templates";
import { BuilderScreen } from "@/modules/sign/ui/screens/builder/builder-screen";
import { builderTemplateVM } from "@/modules/sign/ui/screens/template-cards";
import { WORKSPACE_ROBOTS, loadWorkspace } from "../../_lib/workspace";

export const metadata: Metadata = {
  title: "New document | KarmaKoders Sign",
  robots: WORKSPACE_ROBOTS,
};

type PageProps = { params: Promise<{ template: string }> };

/** Builder for a catalog template. TODO(Step 7): create and autosave the draft. TODO(Step 9): send. */
export default async function SignComposePage({ params }: PageProps) {
  const { template: slug } = await params;
  const template = getTemplateBySlug(slug);
  if (!template) notFound();

  const { plan } = await loadWorkspace(`/tools/sign/new/${template.slug}`);
  return <BuilderScreen vm={{ template: builderTemplateVM(template.slug)!, plan, defaultExpiryDays: 14 }} />;
}
