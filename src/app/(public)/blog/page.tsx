import { CmsPageView, generateCmsMetadata } from "@/components/CmsPageView";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return generateCmsMetadata("blog");
}

export default function BlogPage() {
  return <CmsPageView slug="blog" />;
}
