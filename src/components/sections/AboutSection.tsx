"use client";

import { motion } from "framer-motion";
import { Code2, Cpu, Layers, TrendingUp, Users, Zap } from "lucide-react";

const defaultFeatures = [
  { icon: Zap, title: "Lightning Fast", desc: "Optimised for Core Web Vitals with sub-second load times." },
  { icon: Cpu, title: "AI Integrated", desc: "GPT-4o powered content generation, design adaptation, and insights." },
  { icon: Layers, title: "Modular CMS", desc: "Drag-and-drop section builder with real-time preview." },
  { icon: Code2, title: "Clean Code", desc: "TypeScript-first, fully typed, enterprise-grade architecture." },
  { icon: Users, title: "Team Focused", desc: "Role-based access, collaborative workflows, and audit logs." },
  { icon: TrendingUp, title: "SEO Mastered", desc: "Schema markup, dynamic metadata, and 95+ Lighthouse scores." },
];

interface AboutProps {
  tagline?: string;
  heading?: string;
  body?: string;
  features?: typeof defaultFeatures;
}

export function AboutSection({
  tagline = "Who We Are",
  heading = "We Build Digital Experiences That Captivate",
  body = "karmakoders is a premier digital agency at the intersection of design, engineering, and artificial intelligence. Founded by technologists and designers who believe the web should feel alive, we craft immersive platforms that convert visitors into loyal advocates.",
  features = defaultFeatures,
}: AboutProps) {
  return (
    <section id="about" className="relative py-32 px-8 md:px-24 overflow-hidden">
      {/* bg glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-indigo-500/5 blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
        {/* Left copy */}
        <motion.div initial={{ opacity: 0, x: -40 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }}>
          <span className="text-indigo-400 text-sm font-semibold uppercase tracking-widest">{tagline}</span>
          <h2 className="mt-4 text-4xl md:text-5xl font-bold text-white leading-tight">{heading}</h2>
          <p className="mt-6 text-slate-400 text-lg leading-relaxed">{body}</p>
          <div className="mt-10 flex flex-wrap gap-4">
            <a href="#contact" className="px-7 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-full transition-all shadow-[0_0_20px_rgba(79,70,229,0.4)]">
              Work With Us
            </a>
            <a href="#case-studies" className="px-7 py-3 border border-slate-700 hover:border-indigo-500 text-slate-300 hover:text-white font-semibold rounded-full transition-all">
              View Case Studies
            </a>
          </div>
        </motion.div>

        {/* Right features grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {features.map(({ icon: Icon, title, desc }, i) => (
            <motion.div key={title} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: i * 0.1 }}
              className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-indigo-500/40 transition-colors group">
              <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 group-hover:bg-indigo-500/20 transition-colors mb-4">
                <Icon className="w-5 h-5" />
              </div>
              <h3 className="text-white font-semibold mb-1">{title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
