"use client";

import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import Link from "next/link";

const defaultProjects = [
  {
    title: "Quantum Pay",
    category: "Fintech",
    image: "https://images.unsplash.com/photo-1551288049-bbbda536339a?auto=format&fit=crop&q=80&w=800",
    link: "#",
  },
  {
    title: "Nova Health",
    category: "Healthcare",
    image: "https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&q=80&w=800",
    link: "#",
  },
  {
    title: "Evo Stream",
    category: "Entertainment",
    image: "https://images.unsplash.com/photo-1593784991095-a205039475fe?auto=format&fit=crop&q=80&w=800",
    link: "#",
  },
  {
    title: "Aura Home",
    category: "Real Estate",
    image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&q=80&w=800",
    link: "#",
  },
];

interface ProjectsProps {
  tagline?: string;
  heading?: string;
  projects?: typeof defaultProjects;
}

export function ProjectsSection({
  tagline = "Selected Works",
  heading = "Transforming Visions into Digital Reality",
  projects = defaultProjects,
}: ProjectsProps) {
  return (
    <section id="portfolio" className="py-32 px-8 md:px-24 bg-slate-950">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-20 gap-8">
          <div className="max-w-2xl">
            <motion.span
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="text-indigo-400 text-sm font-semibold uppercase tracking-widest"
            >
              {tagline}
            </motion.span>
            <motion.h2
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="mt-4 text-4xl md:text-5xl font-bold text-white"
            >
              {heading}
            </motion.h2>
          </div>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
          >
            <Link href="/portfolio" className="px-8 py-4 border border-slate-800 hover:border-indigo-500 text-white font-bold rounded-full transition-all flex items-center group">
              View All Projects
              <ArrowUpRight className="ml-2 w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
            </Link>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {projects.map((project, i) => (
            <motion.div
              key={project.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="group relative rounded-3xl overflow-hidden aspect-[4/3] cursor-pointer"
            >
              <Link href={`/portfolio/${project.title.toLowerCase().replace(/ /g, '-')}`}>
                <img
                  src={project.image}
                  alt={project.title}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />
                
                <div className="absolute bottom-0 left-0 p-8 w-full">
                  <p className="text-indigo-400 text-sm font-bold uppercase tracking-widest mb-2">{project.category}</p>
                  <h3 className="text-3xl font-bold text-white group-hover:translate-x-2 transition-transform duration-500">{project.title}</h3>
                </div>
                
                <div className="absolute top-8 right-8 w-12 h-12 rounded-full bg-white/10 backdrop-blur flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                  <ArrowUpRight className="w-6 h-6" />
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
