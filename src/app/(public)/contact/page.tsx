import { CmsPageView, generateCmsMetadata } from "@/components/CmsPageView";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return generateCmsMetadata("contact");
}

export default function ContactPage() {
  return <CmsPageView slug="contact" />;
}
