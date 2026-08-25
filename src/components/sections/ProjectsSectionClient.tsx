"use client";

import { useRef } from "react";
import { motion, MotionConfig } from "framer-motion";
import { ArrowUpRight, ChevronLeft, ChevronRight, HelpCircle, Lightbulb, Target, Cpu, Sparkles } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { useSearchParams } from "next/navigation";
import { findCaseStudyDetail, DEMO_PROJECT_SLUGS } from "@/lib/caseStudyDetails";

export interface ProjectLike {
  id?: string;
  title: string;
  slug: string;
  category?: string;
  description?: string;
  content?: string;
  imageUrl?: string;
  image?: string;
  tags?: string;
}

interface ProjectsSectionClientProps {
  isCentered?: boolean;
  tagline?: string;
  heading?: string;
  subheading?: string;
  capabilities?: string[];
  projects: ProjectLike[];
  isFallback?: boolean;
  limit?: number;
  showViewAll?: boolean;
  isFirstSection?: boolean;
}

const DEFAULT_CAPABILITIES = ["AI", "SAAS", "WEB", "MOBILE"];

export function ProjectsSectionClient({
  isCentered = false,
  tagline = "Case Studies",
  heading = "Real Results for Real Businesses",
  subheading,
  capabilities,
  projects,
  isFallback = false,
  limit = 6,
  showViewAll = true,
  isFirstSection = false,
}: ProjectsSectionClientProps) {
  const searchParams = useSearchParams();
  const categoryParam = searchParams ? searchParams.get("category") : null;

  const filteredProjects = categoryParam
    ? projects.filter((p) => p.category?.toLowerCase() === categoryParam.toLowerCase())
    : projects;

  const displayProjects = limit && limit > 0 ? filteredProjects.slice(0, limit) : filteredProjects;
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const { scrollLeft, clientWidth } = scrollRef.current;
      const scrollAmount = clientWidth * 0.75;
      scrollRef.current.scrollTo({
        left: direction === "left" ? scrollLeft - scrollAmount : scrollLeft + scrollAmount,
        behavior: "smooth",
      });
    }
  };

  const showAsFirst = isFirstSection || isCentered;
  const chips = capabilities && capabilities.length > 0 ? capabilities : DEFAULT_CAPABILITIES;

  return (
    <MotionConfig reducedMotion="user">
    <section id="portfolio" aria-label="Selected projects" className={cn(
      "pb-24 px-6 md:px-12 bg-slate-950 relative overflow-hidden",
      isCentered ? "pt-28 sm:pt-32" : "py-24"
    )}>
      {/* Background glow */}
      <div className="absolute bottom-0 right-0 h-[600px] w-[600px] bg-indigo-500 opacity-[0.015] blur-[150px] rounded-full pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-8">
          <div className={cn("max-w-2xl", isCentered && "text-center mx-auto")}>
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 backdrop-blur-xl border border-white/10 text-indigo-500 text-sm font-bold tracking-widest uppercase mb-6"
            >
              {tagline}
            </motion.div>
            {showAsFirst ? (
              <motion.h1
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
                className="mt-6 text-4xl md:text-5xl lg:text-6xl font-black text-white tracking-tight leading-tight"
              >
                {heading}
              </motion.h1>
            ) : (
              <motion.h2
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
                className="mt-6 text-4xl md:text-5xl lg:text-6xl font-black text-white tracking-tight leading-tight"
              >
                {heading}
              </motion.h2>
            )}

            {showAsFirst && subheading && (
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.15 }}
                className={cn("mt-6 text-lg text-slate-400 leading-relaxed max-w-xl", isCentered && "mx-auto")}
              >
                {subheading}
              </motion.p>
            )}

            {showAsFirst && (
              <motion.div
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.25 }}
                className={cn("mt-8 flex flex-wrap gap-2", isCentered && "justify-center")}
              >
                {chips.map((chip) => (
                  <span
                    key={chip}
                    className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-300 text-xs font-bold tracking-widest uppercase"
                  >
                    {chip}
                  </span>
                ))}
              </motion.div>
            )}

            {showAsFirst && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3 }}
                className={cn("mt-8 flex flex-wrap gap-4", isCentered && "justify-center")}
              >
                <Link
                  href="/contact"
                  className="px-8 py-4 bg-indigo-500 hover:bg-indigo-400 text-slate-950 font-bold rounded-xl transition-all flex items-center gap-2 shadow-[0_0_30px_var(--glow-color)]"
                >
                  Start a Project
                  <ArrowUpRight className="w-5 h-5" />
                </Link>
              </motion.div>
            )}
          </div>

          <div className="flex items-center gap-4 shrink-0 max-md:justify-center">
            {/* Scroll Buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => scroll("left")}
                className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-indigo-500 hover:text-slate-950 hover:border-indigo-500 hover:shadow-indigo-500/20 active:scale-95 transition-all duration-300"
                aria-label="Scroll left"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() => scroll("right")}
                className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-indigo-500 hover:text-slate-950 hover:border-indigo-500 hover:shadow-indigo-500/20 active:scale-95 transition-all duration-300"
                aria-label="Scroll right"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {showViewAll && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
              >
                <Link href="/portfolio" className="px-8 py-4 bg-white/5 backdrop-blur-xl border border-white/10 hover:border-indigo-500/50 hover:bg-white/10 text-white font-bold rounded-xl transition-all flex items-center group shadow-indigo-500/5 hover:shadow-indigo-500/20 whitespace-nowrap">
                  View All Cases
                  <ArrowUpRight className="ml-2 w-5 h-5 text-indigo-500 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                </Link>
              </motion.div>
            )}
          </div>
        </div>

        {isFallback && (
          <div className="mb-8 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-500/5 border border-indigo-500/20 text-slate-400 text-xs font-medium">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            Showing concept examples while live project data loads.
          </div>
        )}

        {/* Horizontal scrollable container */}
        <div
          ref={scrollRef}
          className="flex overflow-x-auto gap-8 snap-x snap-mandatory scrollbar-none scroll-smooth pb-8"
        >
          {displayProjects.map((project, i) => {
            const curated = findCaseStudyDetail(project.slug);
            const details = {
              problem: curated?.problem || project.description || "A complex engineering challenge requiring high performance and custom workflows.",
              solution: curated?.solution || (project.content ? project.content.substring(0, 120) + "..." : "A bespoke software solution built to support growing digital operations."),
              // Only set when we have a real, curated outcome — never invent one for
              // real client projects that don't have a verified metric on file.
              outcome: curated?.outcome,
            };
            const isDemoProject = isFallback || DEMO_PROJECT_SLUGS.has(project.slug);
            const tags = (project.tags || "").split(",").map((t) => t.trim()).filter(Boolean);

            return (
              <motion.div
                key={project.id || project.title}
                initial={{ opacity: 0, x: 50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.6, ease: "easeOut" }}
                className="flex-shrink-0 w-[85vw] sm:w-[500px] md:w-[550px] lg:w-[600px] snap-start group relative rounded-[2.5rem] overflow-hidden cursor-pointer border border-white/10 hover:border-indigo-500/30 bg-white/5 hover:bg-white/10 transition-all duration-500 flex flex-col justify-between"
              >
                <div className="p-8">
                  {/* Top Image area */}
                  <div className="relative rounded-[2rem] overflow-hidden aspect-[16/9] mb-8">
                    <Image
                      src={project.imageUrl || project.image || 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&q=80&w=2000'}
                      alt={project.title}
                      fill
                      sizes="(max-width: 640px) 85vw, (max-width: 768px) 500px, (max-width: 1024px) 550px, 600px"
                      className="object-cover transition-transform duration-1000 group-hover:scale-105"
                      {...(i === 0 ? { priority: true } : { loading: "lazy" as const })}
                    />
                    <div className="absolute inset-0 bg-slate-950/20 mix-blend-multiply" />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent" />

                    <div className="absolute bottom-6 left-6 right-6 flex items-end justify-between gap-3">
                      <div>
                        <span className="px-3 py-1 bg-indigo-500 text-slate-950 text-xxs font-black uppercase tracking-wider rounded-md">
                          {project.category || 'Case Study'}
                        </span>
                        <h3 className="text-2xl sm:text-3xl font-black text-white mt-2 leading-tight group-hover:text-indigo-400 transition-colors duration-300">
                          {project.title}
                        </h3>
                      </div>
                      {isDemoProject && (
                        <span className="shrink-0 px-2.5 py-1 bg-slate-950/70 backdrop-blur-sm border border-white/20 text-white/70 text-[10px] font-bold uppercase tracking-wider rounded-md">
                          Concept
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Case study structured items */}
                  <div className="space-y-4">
                    {/* Problem */}
                    <div className="flex gap-3">
                      <HelpCircle className="w-5 h-5 text-indigo-400/70 shrink-0 mt-0.5" />
                      <div>
                        <span className="text-slate-500 text-xs font-bold uppercase tracking-wider block">The Problem</span>
                        <p className="text-[#D6D6D6] text-sm leading-relaxed font-medium mt-0.5">{details.problem}</p>
                      </div>
                    </div>

                    {/* Solution */}
                    <div className="flex gap-3">
                      <Lightbulb className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
                      <div>
                        <span className="text-slate-500 text-xs font-bold uppercase tracking-wider block">The Solution</span>
                        <p className="text-[#D6D6D6] text-sm leading-relaxed font-medium mt-0.5">{details.solution}</p>
                      </div>
                    </div>

                    {/* Tech stack chips */}
                    {tags.length > 0 && (
                      <div className="flex gap-3">
                        <Cpu className="w-5 h-5 text-indigo-400/80 shrink-0 mt-0.5" />
                        <div className="flex flex-wrap gap-2">
                          {tags.map((tag) => (
                            <span
                              key={tag}
                              className="px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-slate-300 text-xs font-medium"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Outcome: only rendered when we have a real, curated claim —
                        never fabricated for real client projects without one on file */}
                    {details.outcome && (
                      <div className="flex gap-3">
                        <Target className="w-5 h-5 text-indigo-400/70 shrink-0 mt-0.5" />
                        <div>
                          <span className="text-slate-500 text-xs font-bold uppercase tracking-wider block">
                            {isDemoProject ? "Target Outcome" : "Business Outcome"}
                          </span>
                          <p className="text-white text-sm font-bold leading-relaxed mt-0.5">{details.outcome}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom CTA bar */}
                <div className="p-8 pt-0 border-t border-white/5 flex items-center justify-between mt-6">
                  <span className="text-slate-400 text-xs font-bold group-hover:text-indigo-400 transition-colors">
                    Read Full Success Story
                  </span>
                  <Link href={`/portfolio/${project.slug || '#'}`} className="w-12 h-12 rounded-xl bg-slate-950 border border-white/10 flex items-center justify-center text-white group-hover:bg-indigo-500 group-hover:text-slate-950 group-hover:border-indigo-500 transition-all duration-300 shadow-indigo-500/5 group-hover:shadow-indigo-500/25">
                    <ArrowUpRight className="w-6 h-6" />
                  </Link>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
    </MotionConfig>
  );
}
