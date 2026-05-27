"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Star, TrendingUp, Award } from "lucide-react";

const products = [
  {
    rank: "#1",
    name: "KarmaFlow AI",
    tagline: "Automate your entire business workflow with AI agents",
    description: "An intelligent automation platform that connects your tools, learns your processes, and executes tasks autonomously — saving 40+ hours per week.",
    badge: "🏆 Most Popular",
    stats: [{ label: "Time Saved", value: "40+ hrs/wk" }, { label: "Accuracy", value: "99.7%" }, { label: "Integrations", value: "200+" }],
    gradient: "from-[#FFC300]/20 via-[#FFC300]/5 to-transparent",
    borderGlow: "hover:border-[#FFC300]/50 hover:shadow-[0_0_40px_rgba(255,195,0,0.15)]",
    href: "/services",
    tag: "AI Automation",
  },
  {
    rank: "#2",
    name: "KarmaUI Studio",
    tagline: "Premium design system & component library for elite teams",
    description: "Production-ready React components, design tokens, and Figma kits built for agencies that demand visual excellence without compromise.",
    badge: "⚡ Trending",
    stats: [{ label: "Components", value: "500+" }, { label: "Design Systems", value: "12+" }, { label: "Downloads", value: "50K+" }],
    gradient: "from-purple-500/10 via-purple-500/5 to-transparent",
    borderGlow: "hover:border-purple-500/40 hover:shadow-[0_0_40px_rgba(168,85,247,0.1)]",
    href: "/services",
    tag: "Design System",
  },
];

export function ProductsSection() {
  return (
    <section id="products" className="py-32 px-6 md:px-12 bg-[#252422] relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-[#FFC300] opacity-[0.03] blur-[150px] rounded-full pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-20 gap-8">
          <div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 backdrop-blur-xl border border-white/10 text-[#FFC300] text-sm font-bold tracking-widest uppercase mb-6 shadow-[0_0_15px_rgba(255,195,0,0.1)]"
            >
              <TrendingUp className="w-4 h-4" /> Top Products
            </motion.div>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-5xl md:text-6xl font-black text-white tracking-tight"
            >
              Our Flagship<br />Innovations
            </motion.h2>
          </div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
          >
            <Link href="/services" className="px-8 py-4 bg-white/5 backdrop-blur-xl border border-white/10 hover:border-[#FFC300]/40 text-white font-bold rounded-xl transition-all flex items-center gap-2 group">
              All Products <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </motion.div>
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {products.map((product, i) => (
            <motion.div
              key={product.name}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15, duration: 0.6, ease: "easeOut" }}
              className={`group relative rounded-[2.5rem] bg-white/5 backdrop-blur-xl border border-white/10 p-10 overflow-hidden transition-all duration-500 ${product.borderGlow} hover:-translate-y-2`}
            >
              {/* Inner gradient */}
              <div className={`absolute inset-0 bg-gradient-to-br ${product.gradient} opacity-60 pointer-events-none`} />

              <div className="relative z-10">
                {/* Top row */}
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <span className="text-5xl font-black text-white/10 group-hover:text-[#FFC300]/20 transition-colors duration-500 leading-none">{product.rank}</span>
                    <div>
                      <span className="text-xs font-bold uppercase tracking-widest text-[#FFC300] bg-[#FFC300]/10 border border-[#FFC300]/20 px-3 py-1 rounded-full">{product.tag}</span>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-white/60 bg-white/5 border border-white/10 px-3 py-1 rounded-full">{product.badge}</span>
                </div>

                {/* Name + Tagline */}
                <h3 className="text-3xl font-black text-white mb-3 group-hover:text-[#FFC300] transition-colors duration-300">{product.name}</h3>
                <p className="text-[#FFC300] font-bold text-lg mb-4">{product.tagline}</p>
                <p className="text-[#D6D6D6] leading-relaxed mb-8 font-medium">{product.description}</p>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4 mb-10 p-4 rounded-2xl bg-black/20 border border-white/5">
                  {product.stats.map((stat) => (
                    <div key={stat.label} className="text-center">
                      <p className="text-2xl font-black text-white">{stat.value}</p>
                      <p className="text-xs text-[#D6D6D6] font-medium mt-1">{stat.label}</p>
                    </div>
                  ))}
                </div>

                {/* CTA */}
                <Link href={product.href} className="inline-flex items-center gap-2 text-[#FFC300] font-bold text-sm uppercase tracking-widest group-hover:text-white transition-colors">
                  Explore Product <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
