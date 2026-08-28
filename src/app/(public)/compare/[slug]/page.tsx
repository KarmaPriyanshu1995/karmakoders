import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/sections/Footer";
import { RelatedToolLinks } from "@/components/tools/RelatedToolLinks";
import { getPublishedComparison } from "@/lib/tools/queries";
import { breadcrumbJsonLd, jsonLdScript, SITE_URL } from "@/lib/tools/jsonld";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const page = await getPublishedComparison(slug);
  if (!page) return { title: "Registrar comparison | karmakoders" };
  return {
    title: page.seoTitle || `${page.title} | karmakoders`,
    description: page.seoDescription || undefined,
    alternates: { canonical: `${SITE_URL}/compare/${page.slug}` },
  };
}

export default async function RegistrarComparePage({ params }: PageProps) {
  const { slug } = await params;
  const page = await getPublishedComparison(slug);
  if (!page) notFound();

  return (
    <main className="min-h-screen bg-slate-950 flex flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript(
            breadcrumbJsonLd([
              { name: "Home", url: "/" },
              { name: "Free Tools", url: "/free-tools" },
              { name: page.title, url: `/compare/${page.slug}` },
            ])
          ),
        }}
      />
      <Navbar />
      <article className="pt-32 pb-24 px-6 md:px-12 max-w-4xl mx-auto w-full">
        <p className="text-indigo-400 text-sm font-bold uppercase tracking-widest mb-4">Registrar comparison</p>
        <h1 className="text-4xl md:text-5xl font-black text-white mb-8">{page.title}</h1>
        {page.content && (
          <div
            className="prose prose-invert prose-indigo max-w-none mb-10"
            dangerouslySetInnerHTML={{ __html: page.content }}
          />
        )}
        <div className="grid sm:grid-cols-2 gap-4 mb-10">
          {[page.providerA, page.providerB].map((provider) => (
            <div key={provider.id} className="rounded-2xl border border-white/10 p-5">
              <h2 className="text-xl font-bold text-white mb-2">{provider.name}</h2>
              <p className="text-sm text-slate-400 mb-4">Check live prices for a specific domain rather than relying on generic claims.</p>
              <Link
                href={`/go/domain-provider/${provider.slug}?tool=domain-compare`}
                className="text-indigo-400 text-sm font-semibold"
              >
                Visit {provider.name}
              </Link>
            </div>
          ))}
        </div>
        <Link href="/free-tools/domain-compare" className="inline-flex px-5 py-3 rounded-xl bg-indigo-500 text-slate-950 font-bold">
          Check your domain →
        </Link>
        <RelatedToolLinks
          links={[
            { href: "/free-tools/domain-compare", label: "Domain Compare", description: "Live availability and pricing" },
            { href: "/best-domain-registrar", label: "Best domain registrar" },
          ]}
        />
      </article>
      <Footer />
    </main>
  );
}
