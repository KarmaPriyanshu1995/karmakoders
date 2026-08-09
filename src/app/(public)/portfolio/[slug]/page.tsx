
import { getProjectBySlug, getProjects } from "@/lib/actions";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/sections/Footer";
import { notFound } from "next/navigation";
import { Code2, Globe, HelpCircle, Lightbulb, Target, ChevronRight, Sparkles } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { DEFAULT_PROJECTS } from "@/lib/constants";
import { findCaseStudyDetail, DEMO_PROJECT_SLUGS } from "@/lib/caseStudyDetails";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

const SITE_URL = "https://www.karmakoders.com";

interface ProjectRecord {
  id?: string;
  title: string;
  slug: string;
  category?: string | null;
  description: string;
  imageUrl?: string | null;
  image?: string | null;
  content: string;
  link?: string | null;
  tags: string;
}

async function resolveProject(slug: string): Promise<{ project: ProjectRecord | undefined; isFallback: boolean }> {
  let project: ProjectRecord | undefined = (await getProjectBySlug(slug)) ?? undefined;
  let isFallback = false;
  if (!project) {
    project = DEFAULT_PROJECTS.find((p) => p.slug === slug);
    isFallback = true;
  }
  return { project, isFallback };
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const { project } = await resolveProject(slug);

  if (!project) {
    return { title: "Project Not Found | karmakoders" };
  }

  const title = `${project.title} | karmakoders Portfolio`;
  const description = project.description;
  const url = `${SITE_URL}/portfolio/${slug}`;
  const image = project.imageUrl || project.image;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: "website",
      ...(image && { images: [{ url: image }] }),
    },
  };
}

export default async function ProjectDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { project, isFallback } = await resolveProject(slug);

  if (!project) {
    notFound();
  }

  const tags: string[] = project.tags.split(',').map((tag: string) => tag.trim()).filter(Boolean);
  const projectUrl = `${SITE_URL}/portfolio/${slug}`;
  const projectImage = project.imageUrl || project.image || 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&q=80&w=2000';
  const isDemoProject = isFallback || DEMO_PROJECT_SLUGS.has(slug);

  const curated = findCaseStudyDetail(slug);
  const details = {
    problem: curated?.problem || project.description || "A complex engineering challenge requiring high performance and custom workflows.",
    solution: curated?.solution || (project.content ? project.content.substring(0, 160) + "..." : "A bespoke software solution built to support growing digital operations."),
    // Only set when we have a real, curated outcome — never invented for real
    // client projects without a verified metric on file.
    outcome: curated?.outcome,
  };

  // Suggest other projects in the portfolio for cross-linking (Phase 17)
  let relatedProjects: ProjectRecord[] = [];
  try {
    const allProjects = await getProjects();
    relatedProjects = (allProjects.length > 0 ? allProjects : DEFAULT_PROJECTS)
      .filter((p) => p.slug !== slug)
      .slice(0, 3);
  } catch {
    relatedProjects = DEFAULT_PROJECTS.filter((p) => p.slug !== slug).slice(0, 3);
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CreativeWork",
        "@id": `${projectUrl}#project`,
        name: project.title,
        url: projectUrl,
        description: project.description,
        keywords: tags.join(", "),
        ...(projectImage && { image: projectImage }),
        creator: { "@id": `${SITE_URL}/#organization` },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
          { "@type": "ListItem", position: 2, name: "Portfolio", item: `${SITE_URL}/portfolio` },
          { "@type": "ListItem", position: 3, name: project.title, item: projectUrl },
        ],
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    <main className="min-h-screen bg-slate-950 flex flex-col relative overflow-hidden">
      <Navbar />

      <article className="pt-32 pb-24 px-8 md:px-24 max-w-7xl mx-auto w-full">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-slate-500 mb-10">
          <Link href="/" className="hover:text-indigo-400 transition-colors">Home</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <Link href="/portfolio" className="hover:text-indigo-400 transition-colors">Portfolio</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-slate-300">{project.title}</span>
        </nav>

        {isDemoProject && (
          <div className="mb-10 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-500/5 border border-indigo-500/20 text-slate-400 text-xs font-medium">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            Concept project — illustrative example, not a verified client engagement.
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
          <div className="space-y-8">
            <div>
              {project.category && (
                <span className="text-indigo-400 text-sm font-bold uppercase tracking-widest px-3 py-1 bg-indigo-500/10 rounded-full border border-indigo-500/20">
                  {project.category}
                </span>
              )}
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
                  className="px-8 py-4 bg-indigo-500 hover:bg-indigo-400 text-slate-950 font-bold rounded-full transition-all flex items-center gap-2 shadow-[0_0_20px_var(--glow-color)]"
                >
                  Live Project <Globe className="w-5 h-5" />
                </a>
              )}
              <Link
                href="/contact"
                className="px-8 py-4 bg-white/5 border border-white/10 hover:border-indigo-500/50 text-white font-bold rounded-full transition-all flex items-center gap-2"
              >
                Discuss a Similar Project
              </Link>
            </div>
          </div>

          <div className="relative">
            <div className="relative rounded-[32px] overflow-hidden border border-slate-800 aspect-[4/3] shadow-2xl">
              <Image
                src={projectImage}
                alt={project.title}
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                priority
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 to-transparent" />
            </div>

            {/* Glass decoration */}
            <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-indigo-500/20 blur-[80px] -z-10" />
            <div className="absolute -top-6 -left-6 w-32 h-32 bg-cyan-500/20 blur-[80px] -z-10" />
          </div>
        </div>

        {/* Problem / Solution / Outcome — the grid only reserves a third column when
            we actually have a real, curated outcome to show. */}
        <div className={`mt-24 border-t border-slate-900 pt-16 grid grid-cols-1 gap-10 ${details.outcome ? "md:grid-cols-3" : "md:grid-cols-2"}`}>
          <div className="space-y-3">
            <HelpCircle className="w-6 h-6 text-indigo-400/70" />
            <h2 className="text-lg font-bold text-white uppercase tracking-wide">The Challenge</h2>
            <p className="text-slate-400 leading-relaxed">{details.problem}</p>
          </div>
          <div className="space-y-3">
            <Lightbulb className="w-6 h-6 text-indigo-500" />
            <h2 className="text-lg font-bold text-white uppercase tracking-wide">The Solution</h2>
            <p className="text-slate-400 leading-relaxed">{details.solution}</p>
          </div>
          {details.outcome && (
            <div className="space-y-3">
              <Target className="w-6 h-6 text-indigo-400/70" />
              <h2 className="text-lg font-bold text-white uppercase tracking-wide">
                {isDemoProject ? "Target Outcome" : "Business Outcome"}
              </h2>
              <p className="text-white font-semibold leading-relaxed">{details.outcome}</p>
            </div>
          )}
        </div>

        <div className="mt-24 border-t border-slate-900 pt-16">
          <h2 className="text-3xl font-bold text-white mb-10">Project Overview</h2>
          <div className="prose prose-invert prose-indigo max-w-none">
            <div className="text-slate-300 text-lg leading-relaxed space-y-8 whitespace-pre-wrap">
              {project.content}
            </div>
          </div>
        </div>

        {/* Related content: Phase 17/18 internal linking */}
        <div className="mt-24 border-t border-slate-900 pt-16">
          <div className="flex flex-wrap items-center justify-between gap-6 mb-10">
            <h2 className="text-2xl font-bold text-white">More From Our Portfolio</h2>
            <Link href="/portfolio" className="text-indigo-400 font-bold text-sm hover:text-indigo-300 transition-colors flex items-center gap-1">
              View all projects <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {relatedProjects.map((p) => (
              <Link
                key={p.slug}
                href={`/portfolio/${p.slug}`}
                className="group rounded-2xl overflow-hidden border border-white/10 hover:border-indigo-500/30 bg-white/5 hover:bg-white/10 transition-all"
              >
                <div className="relative aspect-[16/10]">
                  <Image
                    src={p.imageUrl || p.image || 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&q=80&w=2000'}
                    alt={p.title}
                    fill
                    sizes="(max-width: 640px) 100vw, 33vw"
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                    loading="lazy"
                  />
                </div>
                <div className="p-4">
                  <span className="text-slate-500 text-xs font-bold uppercase tracking-wide">{p.category || "Case Study"}</span>
                  <h3 className="text-white font-bold mt-1 group-hover:text-indigo-400 transition-colors">{p.title}</h3>
                </div>
              </Link>
            ))}
          </div>
          <div className="mt-10 flex flex-wrap gap-4">
            <Link href="/services" className="text-slate-400 hover:text-indigo-400 text-sm font-medium transition-colors underline underline-offset-4">
              Explore our development services
            </Link>
            <Link href="/blog" className="text-slate-400 hover:text-indigo-400 text-sm font-medium transition-colors underline underline-offset-4">
              Read related insights on our blog
            </Link>
          </div>
        </div>
      </article>

      <Footer />
    </main>
    </>
  );
}
