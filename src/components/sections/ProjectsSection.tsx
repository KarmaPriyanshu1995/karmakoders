"use client";

import { useRef } from "react";
import { motion } from "framer-motion";
import { ArrowUpRight, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";

import { DEFAULT_PROJECTS } from "@/lib/constants";

interface ProjectsProps {
  isCentered?: boolean;
  tagline?: string;
  heading?: string;
  projects?: any[];
  limit?: number;
  showViewAll?: boolean;
}

export function ProjectsSection({
  isCentered = false,
  tagline = "Selected Works",
  heading = "Transforming Visions into Digital Reality",
  projects = DEFAULT_PROJECTS,
  limit = 6,
  showViewAll = true,
}: ProjectsProps) {
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

  return (
    <section id="portfolio" aria-label="Selected projects" className={`${isCentered ? "py-20 sm:py-32" : "pb-20 sm:pb-32"} px-4 sm:px-6 md:px-12 bg-slate-950 relative overflow-hidden`}>
      {/* Background glow */}
      <div className={`${isCentered ? "h-[400px] w-[400px]" : "h-[600px] w-[600px]"} absolute bottom-0 right-0 bg-indigo-500 opacity-[0.03] blur-[150px] rounded-full pointer-events-none`} />

      <div className="max-w-7xl mx-auto relative z-10">
        <div className={`${isCentered && "items-center"} flex flex-col md:flex-row md:items-end justify-between mb-20 gap-8`}>
          <div className={`${isCentered &&"text-center"} max-w-2xl`}>
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 backdrop-blur-xl border border-white/10 text-indigo-500 text-sm font-bold tracking-widest uppercase shadow-indigo-500/10 shadow-[0_0_15px_rgba(var(--color-indigo-500-rgb),0.1)]"
            >
              {tagline}
            </motion.div>
            <motion.h2
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="mt-6 text-5xl md:text-6xl font-black text-white tracking-tight"
            >
              {heading}
            </motion.h2>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Scroll Buttons */}
            <div className="flex gap-2 mr-2">
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
                <Link href="/projects" className="px-8 py-4 bg-white/5 backdrop-blur-xl border border-white/10 hover:border-indigo-500/50 hover:bg-white/10 text-white font-bold rounded-xl transition-all flex items-center group shadow-indigo-500/5 hover:shadow-indigo-500/20">
                  View All Projects
                  <ArrowUpRight className="ml-2 w-6 h-6 text-indigo-500 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                </Link>
              </motion.div>
            )}
          </div>
        </div>

        {/* Horizontal scrollable container */}
        <div 
          ref={scrollRef}
          className="flex overflow-x-auto gap-8 snap-x snap-mandatory scrollbar-none scroll-smooth"
        >
          {displayProjects.map((project, i) => (
            <motion.div
              key={project.id || project.title}
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.6, ease: "easeOut" }}
              className="flex-shrink-0 w-[85vw] sm:w-[450px] md:w-[500px] lg:w-[550px] snap-start group relative rounded-[2rem] overflow-hidden cursor-pointer border border-white/10 hover:border-indigo-500/40 transition-colors duration-500 min-h-[400px] md:min-h-[480px]"
            >
              <Link href={`/portfolio/${project.slug || '#'}`} className="block w-full h-full relative min-h-[400px] md:min-h-[480px]">
                <Image
                  src={project.imageUrl || project.image || 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&q=80&w=2000'}
                  alt={project.title}
                  fill
                  sizes="(max-width: 640px) 85vw, (max-width: 768px) 450px, (max-width: 1024px) 500px, 550px"
                  className="object-cover transition-transform duration-1000 group-hover:scale-105"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent opacity-85 group-hover:opacity-90 transition-opacity duration-500" />
                
                <div className="absolute inset-0 p-8 flex flex-col justify-end">
                  <div className="flex gap-2 mb-4 overflow-hidden">
                    <span className="px-3 py-1 bg-indigo-500/20 backdrop-blur-md border border-indigo-500/30 rounded-full text-indigo-500 text-xs font-bold uppercase tracking-widest translate-y-8 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500">
                      {project.category || 'Case Study'}
                    </span>
                  </div>
                  <h3 className="text-3xl md:text-4xl font-black text-white group-hover:text-indigo-500 transition-colors duration-500 mb-2 leading-tight">
                    {project.title}
                  </h3>
                  <p className="text-[#D6D6D6] opacity-0 h-0 group-hover:opacity-100 group-hover:h-auto transition-all duration-500 line-clamp-2 max-w-lg mt-2 font-medium">
                    {project.description || 'Explore how we engineered scalable success and transformed this brand\'s digital presence.'}
                  </p>
                </div>
                
                <div className="absolute top-8 right-8 w-14 h-14 rounded-full bg-indigo-500 flex items-center justify-center text-slate-950 opacity-0 scale-50 group-hover:scale-100 group-hover:opacity-100 transition-all duration-500 shadow-indigo-500/50 shadow-[0_0_25px_var(--color-indigo-500)]">
                  <ArrowUpRight className="w-7 h-7" />
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}