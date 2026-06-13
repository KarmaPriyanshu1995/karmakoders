import { CmsPageView, generateCmsMetadata } from "@/components/CmsPageView";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return generateCmsMetadata("portfolio");
}

export default function PortfolioPage() {
  return <CmsPageView slug="portfolio" />;
}
