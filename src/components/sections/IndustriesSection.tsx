"use client";

import { motion } from "framer-motion";
import { TrendingUp, Activity, Home, ShoppingBag, Layers, Scale, ArrowRight } from "lucide-react";
import Link from "next/link";

const defaultIndustries = [
  {
    icon: TrendingUp,
    name: "FinTech",
    description: "Secure, compliant, and high-performance trading platforms, ledger architectures, and payment integrations built to handle millions of transactions.",
    delay: 0.1,
  },
  {
    icon: Activity,
    name: "Healthcare",
    description: "HIPAA-compliant telemedicine platforms, diagnostic dashboards, and patient portals designed for absolute data security and zero-downtime reliability.",
    delay: 0.2,
  },
  {
    icon: Home,
    name: "Real Estate",
    description: "Interactive 3D listing platforms, agent workflow solutions, and high-fidelity property management portals built for modern agencies.",
    delay: 0.3,
  },
  {
    icon: ShoppingBag,
    name: "Retail & E-Commerce",
    description: "High-speed storefronts, headlessly integrated checkouts, and custom inventory solutions optimized to boost conversions and retention.",
    delay: 0.4,
  },
  {
    icon: Layers,
    name: "SaaS & Enterprise",
    description: "Scalable cloud platforms, multi-tenant architectures, and complex data pipeline integration engineered for rapid scale and stability.",
    delay: 0.5,
  },
  {
    icon: Scale,
    name: "LegalTech",
    description: "Document automation, secure client communication portals, and case management suites that maintain the highest standards of data integrity.",
    delay: 0.6,
  },
];

interface IndustriesProps {
  tagline?: string;
  heading?: string;
  subheading?: string;
  industries?: typeof defaultIndustries;
}

export function IndustriesSection({
  tagline = "Industries We Serve",
  heading = "Built for Industries That Move Fast",
  subheading = "From fintech to healthcare, we engineer digital products for industries where reliability matters.",
  industries = defaultIndustries,
}: IndustriesProps) {
  return (
    <section id="industries" aria-label="Industries we serve" className="py-24 px-4 sm:px-6 md:px-12 bg-slate-950 relative overflow-hidden border-y border-white/5">
      {/* Background radial glows */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-indigo-500 opacity-[0.015] blur-[150px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-indigo-500 opacity-[0.015] blur-[180px] rounded-full pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-20">
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
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="mt-6 text-[#D6D6D6] text-xl font-medium"
          >
            {subheading}
          </motion.p>
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          {industries.map((ind, i) => (
            <motion.div
              key={ind.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: ind.delay, duration: 0.6, ease: "easeOut" }}
              className="group relative overflow-hidden rounded-[2rem] bg-white/5 border border-white/10 p-8 flex flex-col justify-between hover:bg-white/10 hover:border-indigo-500/30 hover:shadow-indigo-500/10 hover:-translate-y-1 transition-all duration-500"
            >
              {/* Interactive glow effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/0 via-indigo-500/0 to-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />

              <div>
                {/* Icon box */}
                <div className="w-14 h-14 rounded-2xl bg-slate-950 border border-white/10 flex items-center justify-center text-indigo-500 mb-8 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500">
                  <ind.icon className="w-6 h-6" />
                </div>

                <h3 className="text-2xl font-bold text-white mb-4 tracking-tight group-hover:text-indigo-400 transition-colors duration-300">
                  {ind.name}
                </h3>
                <p className="text-[#D6D6D6] text-base leading-relaxed font-medium mb-8">
                  {ind.description}
                </p>
              </div>

              <Link
                href="/portfolio"
                className="inline-flex items-center text-indigo-500 font-bold text-sm uppercase tracking-widest hover:text-white transition-colors group/btn w-fit"
              >
                Learn More
                <ArrowRight className="w-4 h-4 ml-2 group-hover/btn:translate-x-1 transition-transform duration-300" />
              </Link>
            </motion.div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="flex justify-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
          >
            <Link
              href="/portfolio"
              className="px-10 py-5 bg-indigo-500 hover:bg-indigo-500/90 text-slate-950 text-lg font-black rounded-xl transition-all duration-300 shadow-indigo-500/20 hover:shadow-indigo-500/40 hover:-translate-y-1 block text-center"
            >
              See Industry Case Studies
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
