
import { getProjectBySlug } from "@/lib/actions";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/sections/Footer";
import { notFound } from "next/navigation";
import { Code2, Globe } from "lucide-react";
import { DEFAULT_PROJECTS } from "@/lib/constants";

export const revalidate = 60;

export default async function ProjectDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let project: any = await getProjectBySlug(slug);

  if (!project) {
    project = DEFAULT_PROJECTS.find((p) => p.slug === slug);
  }

  if (!project) {
    notFound();
  }

  const tags = project.tags.split(',').map((tag: string) => tag.trim());

  return (
    <main className="min-h-screen bg-slate-950 flex flex-col relative overflow-hidden">
      <Navbar />

      <article className="pt-32 pb-24 px-8 md:px-24 max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
          <div className="space-y-8">
            <div>
              <span className="text-indigo-400 text-sm font-bold uppercase tracking-widest px-3 py-1 bg-indigo-500/10 rounded-full border border-indigo-500/20">
                {project.category}
              </span>
              <h1 className="text-4xl md:text-6xl font-bold text-white mt-6 mb-8 leading-tight">
                {project.title}
              </h1>
              <p className="text-slate-400 text-lg leading-relaxed max-w-xl">
                {project.description}
              </p>
            </div>

            <div className="space-y-6">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Code2 className="w-5 h-5 text-indigo-400" />
                Technologies & Stack
              </h3>
              <div className="flex flex-wrap gap-3">
                {tags.map((tag: string) => (
                  <span key={tag} className="px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-300 text-sm font-medium">
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-4 pt-4">
              {project.link && (
                <a 
                  href={project.link} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-full transition-all flex items-center gap-2 shadow-[0_0_20px_rgba(79,70,229,0.4)]"
                >
                  Live Project <Globe className="w-5 h-5" />
                </a>
              )}
            </div>
          </div>

          <div className="relative">
            <div className="relative rounded-[32px] overflow-hidden border border-slate-800 aspect-[4/3] shadow-2xl">
              <img 
                src={project.imageUrl || project.image} 
                alt={project.title} 
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 to-transparent" />
            </div>
            
            {/* Glass decoration */}
            <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-indigo-500/20 blur-[80px] -z-10" />
            <div className="absolute -top-6 -left-6 w-32 h-32 bg-cyan-500/20 blur-[80px] -z-10" />
          </div>
        </div>

        <div className="mt-24 border-t border-slate-900 pt-16">
          <h2 className="text-3xl font-bold text-white mb-10">Project Overview</h2>
          <div className="prose prose-invert prose-indigo max-w-none">
            <div className="text-slate-300 text-lg leading-relaxed space-y-8 whitespace-pre-wrap">
              {project.content}
            </div>
          </div>
        </div>
      </article>

      <Footer />
    </main>
  );
}
