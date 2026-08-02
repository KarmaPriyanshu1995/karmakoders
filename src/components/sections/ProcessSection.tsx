"use client";

import { motion } from "framer-motion";
import { Search, Map, Paintbrush, Code2, ShieldAlert, Rocket, HeartHandshake } from "lucide-react";

const steps = [
  {
    icon: Search,
    title: "1. Discovery & Research",
    description: "We analyze your business goals, target audience, technical requirements, and competitor landscape to build a bulletproof roadmap under full NDA compliance.",
  },
  {
    icon: Map,
    title: "2. Strategic Planning",
    description: "We document the systems architecture, choose the tech arsenal, draft user flows, and establish bi-weekly agile sprint milestones with transparent deliverables.",
  },
  {
    icon: Paintbrush,
    title: "3. High-Fidelity UI/UX Design",
    description: "Our design team crafts custom, high-end interfaces and scalable design systems that match your brand guidelines and ensure exceptional user flows.",
  },
  {
    icon: Code2,
    title: "4. Full-Stack Development",
    description: "Our senior software engineers build your platform using high-performance Next.js architectures, clean TypeScript, and robust database infrastructures.",
  },
  {
    icon: ShieldAlert,
    title: "5. Rigorous QA & Testing",
    description: "We perform automated unit testing, end-to-end user path simulation, security audits, accessibility checking, and performance optimization.",
  },
  {
    icon: Rocket,
    title: "6. Production Launch",
    description: "We orchestrate seamless server deployment, database migrations, DNS configuration, and speed checks to ensure a perfect launch with zero downtime.",
  },
  {
    icon: HeartHandshake,
    title: "7. Post-Launch Support",
    description: "We provide tiered maintenance, regular security updates, automated backups, and iterative feature development based on live analytics.",
  },
];

interface ProcessProps {
  tagline?: string;
  heading?: string;
}

export function ProcessSection({
  tagline = "Our Methodology",
  heading = "How We Build Successful Products",
}: ProcessProps) {
  return (
    <section id="process" aria-label="Our process timeline" className="py-24 px-4 sm:px-6 md:px-12 bg-slate-950 relative overflow-hidden">
      {/* Background glow orb */}
      <div className="absolute top-1/2 left-0 w-[500px] h-[500px] bg-indigo-500 opacity-[0.01] blur-[150px] rounded-full pointer-events-none transform -translate-y-1/2" />

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 backdrop-blur-xl border border-white/10 text-indigo-500 text-sm font-bold tracking-widest uppercase mb-6"
          >
            {tagline}
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-5xl lg:text-6xl font-black text-white tracking-tight leading-tight"
          >
            {heading}
          </motion.h2>
        </div>

        {/* Timeline Stepper */}
        <div className="relative border-l border-white/10 ml-4 sm:ml-8 md:ml-32 pl-8 sm:pl-12 space-y-16">
          {steps.map((step, i) => {
            return (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                className="relative group"
              >
                {/* Connector point icon */}
                <div className="absolute -left-[57px] sm:-left-[73px] top-1.5 w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-slate-950 border border-white/10 flex items-center justify-center text-indigo-500 group-hover:bg-indigo-500 group-hover:text-slate-950 group-hover:border-indigo-500 transition-all duration-300 shadow-indigo-500/5 group-hover:shadow-indigo-500/30">
                  <step.icon className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>

                {/* Text contents */}
                <div>
                  <h3 className="text-xl sm:text-2xl font-bold text-white mb-3 group-hover:text-indigo-400 transition-colors duration-300">
                    {step.title}
                  </h3>
                  <p className="text-slate-400 text-sm sm:text-base leading-relaxed max-w-3xl font-medium">
                    {step.description}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
