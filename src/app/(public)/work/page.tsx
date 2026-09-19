import type { Metadata } from "next";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/sections/Footer";
import Link from "next/link";
import { PRIMARY_NAV } from "@/lib/content/nav";

export const dynamic = "force-dynamic";

function HubIndex({
  title,
  description,
  items,
}: {
  title: string;
  description: string;
  items: { name: string; href: string; description?: string }[];
}) {
  return (
    <main className="min-h-screen bg-slate-950 flex flex-col">
      <Navbar />
      <section className="pt-32 pb-24 px-6 md:px-12 max-w-6xl mx-auto w-full">
        <h1 className="text-4xl md:text-6xl font-black text-white tracking-tight mb-4">{title}</h1>
        <p className="text-lg text-slate-400 max-w-2xl mb-12">{description}</p>
        <div className="grid md:grid-cols-2 gap-5">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-2xl border border-white/10 bg-white/5 p-6 hover:border-indigo-500/40 transition-colors"
            >
              <h2 className="text-xl font-bold text-white">{item.name}</h2>
              {item.description ? <p className="text-slate-400 mt-2">{item.description}</p> : null}
            </Link>
          ))}
        </div>
      </section>
      <Footer />
    </main>
  );
}

export const metadata: Metadata = {
  title: "Work | karmakoders",
  description: "Portfolio, case studies, and success stories from KarmaKoders.",
};

export default function WorkPage() {
  const work = PRIMARY_NAV.find((item) => item.name === "Work");
  return (
    <HubIndex
      title="Work"
      description="Live deployments, architectural teardowns, and client proof."
      items={work?.children ?? []}
    />
  );
}
