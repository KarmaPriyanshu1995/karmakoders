import { getPageBySlug } from "@/lib/actions";
import { DynamicRenderer } from "@/components/DynamicRenderer";
import { Footer } from "@/components/sections/Footer";
import { Navbar } from "@/components/Navbar";
import { notFound } from "next/navigation";
import { Metadata } from "next";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const page = await getPageBySlug(slug);
  
  if (!page) return {};

  const seoMeta = page.seoMeta ? JSON.parse(page.seoMeta) : {};

  return {
    title: `${page.title} | karmakoders`,
    description: seoMeta.description || `Read about ${page.title} on karmakoders`,
    openGraph: {
      title: `${page.title} | karmakoders`,
      description: seoMeta.description,
    },
  };
}

export default async function DynamicPage({ params }: PageProps) {
  const { slug } = await params;
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
      <div className="pt-20">
        <DynamicRenderer sections={sections} />
      </div>
      <Footer />
    </main>
  );
}
