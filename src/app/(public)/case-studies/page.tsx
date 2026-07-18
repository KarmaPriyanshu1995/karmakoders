import { CmsPageView, generateCmsMetadata } from "@/components/CmsPageView";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return generateCmsMetadata("case-studies");
}

export default function CaseStudiesPage() {
  return <CmsPageView slug="case-studies" />;
}
