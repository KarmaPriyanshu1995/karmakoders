import { getSiteConfig } from "@/lib/actions";
import { mergeSiteContent } from "@/lib/site-content";
import { SiteContentForm } from "@/components/admin/SiteContentForm";

export default async function SiteContentPage() {
  const saved = await getSiteConfig("publicContent");
  return <SiteContentForm initial={mergeSiteContent(saved)} />;
}
