import { CmsPageView, generateCmsMetadata } from "@/components/CmsPageView";
import { getPageBySlug } from "@/lib/pageQueries";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  return generateCmsMetadata(slug);
}

export default async function DynamicPage({ params }: PageProps) {
  const { slug } = await params;
  const page = await getPageBySlug(slug);

  if (!page) {
    notFound();
  }

  return <CmsPageView slug={slug} />;
}
