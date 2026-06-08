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
  h1?: string;
  tagline?: string;
  heading?: string;
  body?: string;
  secondaryBody?: string;
  imageUrl?: string;
  imageAlt?: string;
  imageTitle?: string;
  ctaText?: string;
  ctaUrl?: string;
  internalLinkText?: string;
  internalLinkUrl?: string;
  features?: typeof defaultFeatures;
}

export function AboutSection({
  h1,
  tagline = "Who We Are",
  heading = "We Build Digital Experiences That Captivate",
  body = "karmakoders is a premier digital agency at the intersection of design, engineering, and artificial intelligence. Founded by technologists and designers who believe the web should feel alive, we craft immersive platforms that convert visitors into loyal advocates.",
  secondaryBody,
  imageUrl,
  imageAlt,
  imageTitle,
  ctaText,
  ctaUrl,
  internalLinkText,
  internalLinkUrl,
  features = defaultFeatures,
}: AboutProps) {
  return (
    <section id="about" className="relative py-32 px-8 md:px-24 overflow-hidden">
      {/* bg glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full bg-indigo-500 opacity-[0.02] blur-[200px] pointer-events-none" />

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
        {/* Left copy */}
        <motion.div initial={{ opacity: 0, x: -40 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }} className="flex flex-col items-start">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 backdrop-blur-xl border border-white/10 text-indigo-500 text-sm font-bold tracking-widest uppercase shadow-indigo-500/10 shadow-[0_0_15px_rgba(var(--color-indigo-500-rgb),0.1)] mb-6"
          >
            {tagline}
          </motion.div>
          {h1 ? (
            <h1 className="mt-4 text-4xl md:text-5xl font-black text-white leading-tight tracking-tight">{h1}</h1>
          ) : (
            <h2 className="mt-4 text-4xl md:text-5xl font-black text-white leading-tight tracking-tight">{heading}</h2>
          )}
          {h1 && heading && (
            <h2 className="mt-3 text-2xl md:text-3xl font-semibold text-slate-200">{heading}</h2>
          )}
          <p className="mt-6 text-slate-300 text-lg leading-relaxed font-medium">{body}</p>
          {secondaryBody && (
            <p className="mt-4 text-slate-400 text-base leading-relaxed">{secondaryBody}</p>
          )}
          {imageUrl && (
            <div className="mt-8 rounded-2xl overflow-hidden border border-white/10">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageUrl}
                alt={imageAlt || h1 || heading || "About section image"}
                title={imageTitle}
                className="w-full h-auto object-cover"
              />
            </div>
          )}
          <div className="mt-10 flex flex-wrap gap-4">
            {ctaText && ctaUrl ? (
              <a href={ctaUrl} className="px-8 py-4 bg-indigo-500 hover:bg-indigo-500/90 text-slate-950 font-black rounded-xl transition-all shadow-[0_0_20px_var(--color-indigo-500)]/30 hover:shadow-[0_0_30px_var(--color-indigo-500)] hover:-translate-y-1">
                {ctaText}
              </a>
            ) : (
              <a href="#contact" className="px-8 py-4 bg-indigo-500 hover:bg-indigo-500/90 text-slate-950 font-black rounded-xl transition-all shadow-[0_0_20px_var(--color-indigo-500)]/30 hover:shadow-[0_0_30px_var(--color-indigo-500)] hover:-translate-y-1">
                Work With Us
              </a>
            )}
            {internalLinkText && internalLinkUrl ? (
              <a href={internalLinkUrl} className="px-8 py-4 bg-white/5 backdrop-blur-xl border border-white/10 hover:border-indigo-500/50 hover:bg-white/10 text-white font-bold rounded-xl transition-all shadow-indigo-500/5 hover:shadow-indigo-500/20">
                {internalLinkText}
              </a>
            ) : (
              <a href="#case-studies" className="px-8 py-4 bg-white/5 backdrop-blur-xl border border-white/10 hover:border-indigo-500/50 hover:bg-white/10 text-white font-bold rounded-xl transition-all shadow-indigo-500/5 hover:shadow-indigo-500/20">
                View Case Studies
              </a>
            )}
          </div>
        </motion.div>

        {/* Right features grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {features.map(({ icon: Icon, title, desc }, i) => (
            <motion.div key={title} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: i * 0.1 }}
              className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-indigo-500/30 hover:bg-white/10 hover:-translate-y-1 transition-all duration-300 group">
              <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 group-hover:bg-indigo-500/20 transition-colors mb-4">
                <Icon className="w-5 h-5" />
              </div>
              <h3 className="text-white font-bold mb-1">{title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed font-medium">{desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
