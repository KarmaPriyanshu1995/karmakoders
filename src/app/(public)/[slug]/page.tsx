import { CmsPageView, generateCmsMetadata } from "@/components/CmsPageView";
import { getPageBySlug } from "@/lib/pageQueries";
import { getPublishedSeoLandingPage } from "@/lib/tools/queries";
import { SeoLandingView, seoLandingMetadata } from "@/components/tools/SeoLandingView";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const landing = await getPublishedSeoLandingPage(slug);
  if (landing) return seoLandingMetadata(landing);
  return generateCmsMetadata(slug);
}

export default async function DynamicPage({ params }: PageProps) {
  const { slug } = await params;
  const page = await getPageBySlug(slug);

  if (page) {
    return <CmsPageView slug={slug} />;
  }

  const landing = await getPublishedSeoLandingPage(slug);
  if (landing) {
    return <SeoLandingView page={landing} />;
  }

  redirect("/404");
}
