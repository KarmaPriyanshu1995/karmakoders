import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/sections/Footer";
import { DomainCompareTool } from "@/components/tools/DomainCompareTool";
import { ToolSeoContent } from "@/components/tools/ToolSeoContent";
import { getPublishedToolBySlug } from "@/lib/tools/queries";
import { getFreeToolsSettings } from "@/lib/tools/settings";
import { getPrimaryTenantId } from "@/lib/tenant-context";
import { prisma } from "@/lib/prisma";
import { recordToolEvent } from "@/lib/tools/analytics";
import { breadcrumbJsonLd, faqJsonLd, jsonLdScript, SITE_URL, webApplicationJsonLd } from "@/lib/tools/jsonld";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ domain?: string }>;
}

function parseContent(raw: string | null) {
  if (!raw) return { sections: [], faq: [], heroHeading: "", heroSubheading: "" };
  try {
    return JSON.parse(raw) as {
      heroHeading?: string;
      heroSubheading?: string;
      sections?: { heading: string; body: string }[];
      faq?: { question: string; answer: string }[];
    };
  } catch {
    return { sections: [], faq: [], heroHeading: "", heroSubheading: "" };
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const tool = await getPublishedToolBySlug(slug);
  if (!tool) return { title: "Tool not found | karmakoders" };
  const title = tool.seoTitle || `${tool.name} | karmakoders`;
  const description = tool.seoDescription || tool.shortDescription;
  const url = `${SITE_URL}${tool.toolUrl || `/free-tools/${tool.slug}`}`;
  const canonical = tool.canonicalUrl || url;
  const noIndex = tool.robots ? /noindex/i.test(tool.robots) : false;
  return {
    title,
    description,
    keywords: tool.seoKeywords || undefined,
    alternates: { canonical },
    robots: noIndex ? { index: false, follow: true } : { index: true, follow: true },
    openGraph: {
      title: tool.ogTitle || title,
      description: tool.ogDescription || description,
      url: canonical,
      ...(tool.ogImage ? { images: [{ url: tool.ogImage }] } : {}),
    },
  };
}

export default async function FreeToolPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const query = await searchParams;
  const tool = await getPublishedToolBySlug(slug);
  if (!tool) notFound();

  const tenantId = await getPrimaryTenantId();
  const settings = await getFreeToolsSettings(tenantId);
  const content = parseContent(tool.contentJson);
  await recordToolEvent({ tenantId, eventType: "tool_view", toolId: tool.id });

  const [tlds, comparisons, landings] = await Promise.all([
    prisma.domainExtension.findMany({ where: { tenantId, status: "published" }, select: { tld: true, name: true }, take: 4 }),
    prisma.registrarComparison.findMany({ where: { tenantId, status: "published" }, select: { slug: true, title: true }, take: 2 }),
    prisma.seoLandingPage.findMany({ where: { tenantId, status: "published" }, select: { slug: true, title: true }, take: 2 }),
  ]);

  const extraLinks = [
    ...tlds.map((t) => ({ href: `/domains/${t.tld}`, label: t.name, description: `Compare .${t.tld} domain prices` })),
    ...comparisons.map((c) => ({ href: `/compare/${c.slug}`, label: c.title, description: "Registrar comparison" })),
    ...landings.map((p) => ({ href: `/${p.slug}`, label: p.title })),
  ];

  const url = tool.toolUrl || `/free-tools/${tool.slug}`;
  const graphs: unknown[] = [
    breadcrumbJsonLd([
      { name: "Home", url: "/" },
      { name: "Free Tools", url: "/free-tools" },
      { name: tool.name, url },
    ]),
    webApplicationJsonLd({
      name: tool.name,
      description: tool.seoDescription || tool.shortDescription,
      url,
    }),
  ];
  if (content.faq?.length) graphs.push(faqJsonLd(content.faq));

  return (
    <main className="min-h-screen bg-slate-950 flex flex-col">
      {graphs.map((graph, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(graph) }} />
      ))}
      <Navbar />
      <div className="pt-32 pb-24 px-6 md:px-12 max-w-5xl mx-auto w-full">
        <p className="text-indigo-400 text-sm font-bold uppercase tracking-widest mb-4">
          <a href="/free-tools" className="hover:text-white">Free Tools</a>
          {tool.category ? ` · ${tool.category.name}` : ""}
        </p>
        <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-4">
          {content.heroHeading || tool.name}
        </h1>
        <p className="text-lg text-slate-400 leading-relaxed mb-10 max-w-3xl">
          {content.heroSubheading || tool.longDescription || tool.shortDescription}
        </p>

        {tool.slug === "domain-compare" ? (
          <DomainCompareTool initialDomain={query.domain || ""} disclosure={settings.affiliateDisclosure} />
        ) : (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-slate-300">
            This tool is published and ready for an interactive implementation.
          </div>
        )}

        <ToolSeoContent content={content} extraLinks={extraLinks} />
      </div>
      <Footer />
    </main>
  );
}
