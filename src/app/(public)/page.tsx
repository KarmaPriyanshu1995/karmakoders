import { getPageBySlug } from "@/lib/actions";
import { DynamicRenderer } from "@/components/DynamicRenderer";
import { Footer } from "@/components/sections/Footer";
import { Navbar } from "@/components/Navbar";
import { Metadata } from "next";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "karmakoders – Premium AI Business Portfolio",
    description: "We build premium, scalable, and immersive web platforms powered by advanced AI.",
    openGraph: {
      title: "karmakoders – Premium AI Business Portfolio",
      type: "website",
    },
  };
}

export default async function HomePage() {
  const page = await getPageBySlug("/");

  const sections = page?.sections.map((s) => ({
    id: s.id,
    type: s.type,
    content: JSON.parse(s.content),
  })) ?? [
    {
      id: "fallback-hero",
      type: "hero",
      content: {
        headline: "Design the Future of Your Brand",
        subheadline: "We build premium, scalable, and immersive web platforms powered by advanced AI.",
      },
    },
  ];

  return (
    <main className="min-h-screen bg-slate-950 flex flex-col relative overflow-hidden">
      <Navbar />
      <DynamicRenderer sections={sections} />
      <Footer />
    </main>
  );
}
