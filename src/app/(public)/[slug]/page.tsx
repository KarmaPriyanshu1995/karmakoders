import { CmsPageView, generateCmsMetadata } from "@/components/CmsPageView";

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
  return <CmsPageView slug={slug} />;
}
