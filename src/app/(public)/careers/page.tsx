import { CmsPageView, generateCmsMetadata } from "@/components/CmsPageView";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return generateCmsMetadata("careers");
}

export default function CareersPage() {
  return <CmsPageView slug="careers" />;
}

