import { CmsPageView, generateCmsMetadata } from "@/components/CmsPageView";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return generateCmsMetadata("services");
}

export default function ServicesPage() {
  return <CmsPageView slug="services" />;
}
