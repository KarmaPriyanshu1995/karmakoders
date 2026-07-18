import { getPageBySlug } from "@/lib/pageQueries";
import { DynamicRenderer } from "@/components/DynamicRenderer";
import { Footer } from "@/components/sections/Footer";
import { Navbar } from "@/components/Navbar";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import { SITE_PAGES } from "@/lib/sitePages";

interface CmsPageViewProps {
  slug: string;
  withTopPadding?: boolean;
}

export async function generateCmsMetadata(slug: string): Promise<Metadata> {
  const page = await getPageBySlug(slug);
  const siteDef = SITE_PAGES.find((p) => p.slug === slug);

  if (!page && !siteDef) {
    return { title: "karmakoders" };
  }

  const seoMeta = page?.seoMeta ? JSON.parse(page.seoMeta) : {};
  const title = seoMeta.title || siteDef?.defaultMeta?.title || `${page?.title || siteDef?.title} | karmakoders`;
  const description =
    seoMeta.description ||
    siteDef?.defaultMeta?.description ||
    `Read about ${page?.title || siteDef?.title} on karmakoders`;

  return {
    title,
    description,
    openGraph: { title, description },
  };
}

export async function CmsPageView({ slug, withTopPadding = true }: CmsPageViewProps) {
  const page = await getPageBySlug(slug);

  if (!page || (!page.isPublished && process.env.NODE_ENV === "production")) {
    notFound();
  }

  const sections = page.sections.map((s) => ({
    id: s.id,
    type: s.type,
    content: JSON.parse(s.content),
  }));

  return (
    <main className="min-h-screen bg-slate-950 flex flex-col relative overflow-hidden">
      <Navbar />
      <div className={withTopPadding ? "pt-20" : undefined}>
        <DynamicRenderer sections={sections} />
      </div>
      <Footer />
    </main>
  );
}
