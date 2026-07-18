import { CmsPageView, generateCmsMetadata } from "@/components/CmsPageView";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return generateCmsMetadata("home");
}

export default function HomePage() {
  return <CmsPageView slug="home" withTopPadding={false} />;
}
