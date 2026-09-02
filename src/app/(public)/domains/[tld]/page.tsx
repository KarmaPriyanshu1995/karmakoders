import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/sections/Footer";
import { RelatedToolLinks } from "@/components/tools/RelatedToolLinks";
import { getLatestTldPrices, getPublishedTld } from "@/lib/tools/queries";
import { getPrimaryTenantId } from "@/lib/tenant-context";
import { breadcrumbJsonLd, faqJsonLd, jsonLdScript, SITE_URL } from "@/lib/tools/jsonld";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ tld: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { tld } = await params;
  const page = await getPublishedTld(tld);
  if (!page) return { title: "Domain extension | karmakoders" };
  return {
    title: page.seoTitle || `${page.name} | karmakoders`,
    description: page.seoDescription || page.description || undefined,
    alternates: { canonical: `${SITE_URL}/domains/${page.tld}` },
  };
}

export default async function DomainTldPage({ params }: PageProps) {
  const { tld } = await params;
  const page = await getPublishedTld(tld);
  if (!page) notFound();
  const tenantId = await getPrimaryTenantId();
  const prices = await getLatestTldPrices(tenantId, page.tld);
  const faq = page.faqJson
    ? (JSON.parse(page.faqJson) as { question: string; answer: string }[])
    : [];

  return (
    <main className="min-h-screen bg-slate-950 flex flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript(
            breadcrumbJsonLd([
              { name: "Home", url: "/" },
              { name: "Free Tools", url: "/free-tools" },
              { name: page.name, url: `/domains/${page.tld}` },
            ])
          ),
        }}
      />
      {faq.length > 0 && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(faqJsonLd(faq)) }} />
      )}
      <Navbar />
      <article className="pt-32 pb-24 px-6 md:px-12 max-w-4xl mx-auto w-full">
        <p className="text-indigo-400 text-sm font-bold uppercase tracking-widest mb-4">Domain extensions</p>
        <h1 className="text-4xl md:text-5xl font-black text-white mb-6">{page.name}</h1>
        {page.description && <p className="text-lg text-slate-400 mb-10">{page.description}</p>}
        {page.content && (
          <div
            className="prose prose-invert prose-indigo max-w-none mb-12"
            dangerouslySetInnerHTML={{ __html: page.content }}
          />
        )}

        {prices.some((p) => p.latest) && (
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-white mb-4">Recently observed .{page.tld} prices</h2>
            <p className="text-sm text-slate-500 mb-4">Indicative snapshots from previous lookups. Final prices may vary at checkout.</p>
            <div className="space-y-3">
              {prices.map(({ provider, latest }) => (
                <div key={provider.id} className="flex justify-between gap-4 rounded-xl border border-white/10 px-4 py-3 text-sm">
                  <span className="text-white font-semibold">{provider.name}</span>
                  <span className="text-slate-400">
                    {latest?.registrationPrice != null ? `First year ~$${latest.registrationPrice.toFixed(2)}` : "No recent price"}
                    {latest?.renewalPrice != null ? ` · Renewal ~$${latest.renewalPrice.toFixed(2)}` : ""}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        <Link
          href={`/free-tools/domain-compare`}
          className="inline-flex px-5 py-3 rounded-xl bg-indigo-500 text-slate-950 font-bold"
        >
          Compare .{page.tld} domain prices
        </Link>

        <RelatedToolLinks
          links={[
            { href: "/free-tools/domain-compare", label: "Domain Compare", description: "Check a specific domain across registrars" },
            { href: "/cheapest-domain-registrar", label: "Cheapest domain registrar" },
          ]}
        />
      </article>
      <Footer />
    </main>
  );
}
