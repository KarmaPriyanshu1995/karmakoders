"use client";

import { useRef, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowUpRight, ChevronLeft, ChevronRight, HelpCircle, Lightbulb, Target, Cpu } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";

import { DEFAULT_PROJECTS } from "@/lib/constants";
import { getProjects } from "@/lib/actions";

interface ProjectsProps {
  isCentered?: boolean;
  tagline?: string;
  heading?: string;
  projects?: any[];
  limit?: number;
  showViewAll?: boolean;
  isFirstSection?: boolean;
}

// Enterprise structured case study details mapped by project slug
const structuredCaseStudies: Record<string, { problem: string; solution: string; outcome: string }> = {
  "quantum-pay": {
    problem: "Traditional cross-border payments took 2-4 days with high transaction fees, causing 45% checkout abandonment for merchants.",
    solution: "Engineered a secure, decentralized payment routing gateway on Next.js, integrating custom smart contracts that settle payments under 5 seconds.",
    outcome: "Reduced checkout abandonment by 35% and cut transaction fees by 60% globally.",
  },
  "nova-health": {
    problem: "Patients faced long wait times (4+ hours) to consult health specialists online, with no instant symptoms sorting tool.",
    solution: "Built a cross-platform mobile application combining a secure TensorFlow screening bot with encrypted WebRTC peer video routing.",
    outcome: "Reduced patient connection times to under 8 minutes with a 99.9% telemedicine connection SLA.",
  },
  "evo-stream": {
    problem: "High-fidelity spatial audio and video streams suffered from severe buffering delays and expensive cloud distribution costs.",
    solution: "Architected a custom media slicing pipeline paired with optimized AWS S3 bucket caching and CloudFront CDN routing.",
    outcome: "Reduced buffering latency by 95% while supporting 140% growth in concurrent streams.",
  },
  "aura-home": {
    problem: "International luxury property buyers had no realistic way to walk through listings remotely, resulting in slow sales cycles.",
    solution: "Created interactive, photorealistic web-based 3D virtual tours rendering high-poly models in real-time via Three.js.",
    outcome: "Sped up property sales closings by 40% and generated 2.2x more overseas leads.",
  },
};

export function ProjectsSection({
  isCentered = false,
  tagline = "Case Studies",
  heading = "Real Results for Real Businesses",
  projects: propProjects,
  limit = 6,
  showViewAll = true,
  isFirstSection = false,
}: ProjectsProps) {
  const [liveProjects, setLiveProjects] = useState<any[]>([]);

  useEffect(() => {
    if (!propProjects) {
      getProjects()
        .then((data) => {
          if (data && data.length > 0) {
            setLiveProjects(data);
          } else {
            setLiveProjects(DEFAULT_PROJECTS);
          }
        })
        .catch((err) => {
          console.error("Failed to load live projects:", err);
          setLiveProjects(DEFAULT_PROJECTS);
        });
    }
  }, [propProjects]);

  const projects = propProjects || (liveProjects.length > 0 ? liveProjects : DEFAULT_PROJECTS);
  const displayProjects = (limit && limit > 0) ? projects.slice(0, limit) : projects;
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

  return (
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

        {/* Horizontal scrollable container */}
        <div 
          ref={scrollRef}
          className="flex overflow-x-auto gap-8 snap-x snap-mandatory scrollbar-none scroll-smooth pb-8"
        >
          {displayProjects.map((project, i) => {
            // Get structured content mapping or fallback
            const details = structuredCaseStudies[project.slug] || {
              problem: project.description || "A complex engineering challenge requiring high performance and custom workflows.",
              solution: project.content?.substring(0, 120) + "..." || "A bespoke software solution built to support growing digital operations.",
              outcome: "100% Secure & Fully Optimized Architecture",
            };

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
                    
                    <div className="absolute bottom-6 left-6 right-6">
                      <span className="px-3 py-1 bg-indigo-500 text-slate-950 text-xxs font-black uppercase tracking-wider rounded-md">
                        {project.category || 'Case Study'}
                      </span>
                      <h3 className="text-2xl sm:text-3xl font-black text-white mt-2 leading-tight group-hover:text-indigo-400 transition-colors duration-300">
                        {project.title}
                      </h3>
                    </div>
                  </div>

                  {/* Case study structured items */}
                  <div className="space-y-4">
                    {/* Problem */}
                    <div className="flex gap-3">
                      <HelpCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
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

                    {/* Tech stack */}
                    <div className="flex gap-3">
                      <Cpu className="w-5 h-5 text-indigo-400/80 shrink-0 mt-0.5" />
                      <div>
                        <span className="text-slate-500 text-xs font-bold uppercase tracking-wider block">Technologies</span>
                        <p className="text-[#D6D6D6] text-sm leading-relaxed font-medium mt-0.5">{project.tags}</p>
                      </div>
                    </div>

                    {/* Outcome */}
                    <div className="flex gap-3">
                      <Target className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                      <div>
                        <span className="text-slate-500 text-xs font-bold uppercase tracking-wider block">Business Outcome</span>
                        <p className="text-white text-sm font-bold leading-relaxed mt-0.5">{details.outcome}</p>
                      </div>
                    </div>
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
  );
}