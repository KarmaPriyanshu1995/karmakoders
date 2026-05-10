import { ProjectsSection } from "@/components/sections/ProjectsSection";
import { CaseStudiesSection } from "@/components/sections/CaseStudiesSection";
import { Footer } from "@/components/sections/Footer";
import { Navbar } from "@/components/Navbar";

export const metadata = {
  title: "Portfolio | karmakoders",
  description: "Transforming visions into digital reality - our selected works and case studies.",
};

export default function PortfolioPage() {
  return (
    <main className="min-h-screen bg-slate-950 flex flex-col relative overflow-hidden">
      <Navbar />

      <div className="pt-20">
        <ProjectsSection />
        <CaseStudiesSection />
      </div>

      <Footer />
    </main>
  );
}
