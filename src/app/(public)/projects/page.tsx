
import { getProjects } from "@/lib/actions";
import { ProjectsSection } from "@/components/sections/ProjectsSection";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/sections/Footer";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "All Projects | karmakoders",
  description: "A complete list of our digital transformations and successful projects.",
};

export default async function ProjectsPage() {
  const projects = await getProjects();

  return (
    <main className="min-h-screen bg-slate-950 flex flex-col relative overflow-hidden">
      <Navbar />

      <div>
        <ProjectsSection 
          tagline="Full Portfolio"
          heading="Every Vision We've Brought to Life"
          projects={projects.length > 0 ? projects : undefined}
          limit={0}
          showViewAll={false}
        />
      </div>

      <Footer />
    </main>
  );
}
