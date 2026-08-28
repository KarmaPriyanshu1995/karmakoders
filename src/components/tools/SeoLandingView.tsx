import type { Metadata } from "next";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/sections/Footer";
import { RelatedToolLinks } from "@/components/tools/RelatedToolLinks";
import { breadcrumbJsonLd, jsonLdScript, SITE_URL } from "@/lib/tools/jsonld";
import type { SeoLandingPage } from "@prisma/client";

export function seoLandingMetadata(page: SeoLandingPage): Metadata {
  const url = `${SITE_URL}/${page.slug}`;
  return {
    title: page.seoTitle || `${page.title} | karmakoders`,
    description: page.seoDescription || undefined,
    alternates: { canonical: page.canonicalUrl || url },
    openGraph: {
      title: page.seoTitle || page.title,
      description: page.seoDescription || undefined,
      url: page.canonicalUrl || url,
      ...(page.ogImage ? { images: [{ url: page.ogImage }] } : {}),
    },
  };
}

export function SeoLandingView({ page }: { page: SeoLandingPage }) {
  return (
    <main className="min-h-screen bg-slate-950 flex flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript(
            breadcrumbJsonLd([
              { name: "Home", url: "/" },
              { name: "Free Tools", url: "/free-tools" },
              { name: page.title, url: `/${page.slug}` },
            ])
          ),
        }}
      />
      <Navbar />
      <article className="pt-32 pb-24 px-6 md:px-12 max-w-4xl mx-auto w-full">
        <h1 className="text-4xl md:text-5xl font-black text-white mb-8">{page.title}</h1>
        <div
          className="prose prose-invert prose-indigo max-w-none"
          dangerouslySetInnerHTML={{ __html: page.content }}
        />
        <RelatedToolLinks
          links={[
            { href: "/free-tools/domain-compare", label: "Try our Domain Compare tool →", description: "Check availability and prices" },
            { href: "/domains/com", label: "Compare .com domain prices" },
          ]}
        />
      </article>
      <Footer />
    </main>
  );
}
