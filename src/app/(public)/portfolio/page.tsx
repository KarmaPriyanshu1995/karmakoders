import { getProjects, getCaseStudies } from "@/lib/actions";
import { ProjectsSection } from "@/components/sections/ProjectsSection";
import { CaseStudiesSection } from "@/components/sections/CaseStudiesSection";
import { Footer } from "@/components/sections/Footer";
import { Navbar } from "@/components/Navbar";

export const metadata = {
  title: "Portfolio | karmakoders",
  description: "Transforming visions into digital reality - our selected works and case studies.",
};

export default async function PortfolioPage() {
  const projects = await getProjects();
  const cases = await getCaseStudies();

  return (
    <main className="min-h-screen bg-slate-950 flex flex-col relative overflow-hidden">
      <Navbar />

      <div className="pt-20">
        <ProjectsSection 
          projects={projects.length > 0 ? projects : undefined} 
          limit={4}
          showViewAll={true}
        />
        <CaseStudiesSection 
          cases={cases.length > 0 ? cases : undefined}
          limit={2}
          showViewAll={true}
        />
      </div>

      <Footer />
    </main>
  );
}
