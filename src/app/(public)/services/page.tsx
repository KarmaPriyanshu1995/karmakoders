import { ServicesSection } from "@/components/sections/ServicesSection";
import { Footer } from "@/components/sections/Footer";
import { Navbar } from "@/components/Navbar";

export const metadata = {
  title: "Services | karmakoders",
  description: "Comprehensive solutions for your business - UI/UX, Web Dev, AI, and more.",
};

export default function ServicesPage() {
  return (
    <main className="min-h-screen bg-slate-950 flex flex-col relative overflow-hidden">
      <Navbar />

      <div className="pt-20">
        <ServicesSection />
      </div>

      <Footer />
    </main>
  );
}
