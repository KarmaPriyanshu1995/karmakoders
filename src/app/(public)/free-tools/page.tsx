import type { Metadata } from "next";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/sections/Footer";
import { FreeToolsCatalog } from "@/components/tools/FreeToolsCatalog";
import { getPublishedTools, getToolCategories } from "@/lib/tools/queries";
import { breadcrumbJsonLd, jsonLdScript, SITE_URL } from "@/lib/tools/jsonld";
import { generateCmsMetadata } from "@/components/CmsPageView";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const cms = await generateCmsMetadata("free-tools");
  return {
    ...cms,
    title: cms.title || "Free Tools | karmakoders",
    description:
      (typeof cms.description === "string" && cms.description) ||
      "Useful free tools for founders, developers, marketers and businesses.",
    alternates: { canonical: `${SITE_URL}/free-tools` },
  };
}

export default async function FreeToolsPage() {
  const [tools, categories] = await Promise.all([getPublishedTools(), getToolCategories()]);

  const jsonLd = breadcrumbJsonLd([
    { name: "Home", url: "/" },
    { name: "Free Tools", url: "/free-tools" },
  ]);

  return (
    <main className="min-h-screen bg-slate-950 flex flex-col">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(jsonLd) }} />
      <Navbar />
      <div className="pt-40 pb-32 px-6 md:px-12 max-w-7xl mx-auto w-full">
        <header className="max-w-3xl mb-14">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 backdrop-blur-xl border border-white/10 text-indigo-500 text-sm font-bold tracking-widest uppercase mb-6">
            Free Tools
          </div>
          <h1 className="text-4xl md:text-6xl font-black text-white tracking-tight mb-6">Free Tools</h1>
          <p className="text-lg text-slate-400 leading-relaxed">
            Powerful tools to help you research, compare and make better business decisions.
          </p>
        </header>
        <FreeToolsCatalog
          tools={tools.map((tool) => ({
            id: tool.id,
            name: tool.name,
            slug: tool.slug,
            shortDescription: tool.shortDescription,
            icon: tool.icon,
            isFeatured: tool.isFeatured,
            toolUrl: tool.toolUrl,
            category: tool.category ? { name: tool.category.name, slug: tool.category.slug } : null,
            seoKeywords: tool.seoKeywords,
          }))}
          categories={categories.map((c) => ({ name: c.name, slug: c.slug }))}
        />
      </div>
      <Footer />
    </main>
  );
}
