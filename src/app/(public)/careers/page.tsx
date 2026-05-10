import { CareersSection } from "@/components/sections/CareersSection";
import { Footer } from "@/components/sections/Footer";
import { Navbar } from "@/components/Navbar";

export const metadata = {
  title: "Careers | karmakoders",
  description: "Join our mission to build the future of the immersive web.",
};

export default function CareersPage() {
  return (
    <main className="min-h-screen bg-slate-950 flex flex-col relative overflow-hidden">
      <Navbar />

      <div className="pt-20">
        <CareersSection />
      </div>

      <section className="py-24 px-8 md:px-24 bg-slate-900/10">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-6">Our Culture</h2>
          <p className="text-slate-400 text-lg leading-relaxed">
            We are a distributed team of dreamers, makers, and explorers. We value autonomy, 
            creativity, and the relentless pursuit of excellence.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-12">
            {[["Remote-first", "Work from anywhere"], ["Health", "Premium coverage"], ["Growth", "Annual learning budget"], ["Equity", "Share in our success"]].map(([title, desc]) => (
              <div key={title} className="text-center">
                <div className="text-indigo-400 font-bold mb-2">{title}</div>
                <div className="text-slate-500 text-xs">{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
