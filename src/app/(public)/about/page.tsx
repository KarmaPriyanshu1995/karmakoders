import { AboutSection } from "@/components/sections/AboutSection";
import { TeamSection } from "@/components/sections/TeamSection";
import { TestimonialsSection } from "@/components/sections/TestimonialsSection";
import { Footer } from "@/components/sections/Footer";
import { Navbar } from "@/components/Navbar";

export const metadata = {
  title: "About Us | karmakoders",
  description: "Learn more about the minds behind karmakoders and our mission.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-slate-950 flex flex-col relative overflow-hidden">
      <Navbar />

      <div>
        <AboutSection />
        <TeamSection isSpace={true} />
        <TestimonialsSection />
      </div>

      <Footer />
    </main>
  );
}
