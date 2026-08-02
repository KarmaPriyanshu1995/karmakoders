"use client";

import { motion } from "framer-motion";
import { Code2, Palette, Globe2, Layers, Smartphone, ArrowRight, Brain, Cloud } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const defaultServices = [
  {
    icon: Code2,
    title: "Custom Software Development",
    description: "Enterprise-grade bespoke software systems designed to solve complex business operations with robust architectures and absolute data safety.",
    benefit: "✔ 100% IP Transfer & NDA Protected",
    cta: "Explore Custom Software",
    delay: 0.1,
  },
  {
    icon: Smartphone,
    title: "Mobile App Development",
    description: "Native iOS and Android mobile solutions engineered for smooth performance, high offline accessibility, and interactive design layouts.",
    benefit: "✔ Swift, Kotlin, & React Native Expert",
    cta: "Explore Mobile Apps",
    delay: 0.2,
  },
  {
    icon: Brain,
    title: "AI Solutions & Integrations",
    description: "Integrate LLMs, neural searches, custom machine learning pipelines, and autonomous agentic workflows directly into your platform.",
    benefit: "✔ Proprietary models & predictive intelligence",
    cta: "Explore AI Solutions",
    delay: 0.3,
  },
  {
    icon: Layers,
    title: "SaaS Development",
    description: "Scalable multi-tenant subscription products built on high-speed Next.js frameworks with automated billing systems and analytic setups.",
    benefit: "✔ Multi-Region Deployment ready",
    cta: "Explore SaaS Dev",
    delay: 0.4,
  },
  {
    icon: Globe2,
    title: "Website Development",
    description: "Premium corporate portals and headless web platforms optimized for fast loading speeds, search engine discoverability, and CRO.",
    benefit: "✔ Built for SEO & PageSpeed dominance",
    cta: "Explore Web Engineering",
    delay: 0.5,
  },
  {
    icon: Palette,
    title: "UI/UX Design & Branding",
    description: "High-end user interfaces, comprehensive wireframing, interactive prototyping, and custom typography to capture and convert users.",
    benefit: "✔ Fully verified through user paths",
    cta: "Explore UI/UX Services",
    delay: 0.6,
  },
  {
    icon: Cloud,
    title: "Cloud Engineering & DevOps",
    description: "Secure, auto-scaling cloud deployments on AWS and Google Cloud with continuous automated monitoring, audits, and SLA guarantees.",
    benefit: "✔ 99.99% Infrastructure Uptime guarantees",
    cta: "Explore Cloud DevOps",
    delay: 0.7,
  },
];

interface ServicesProps {
  isSpace?: boolean;
  tagline?: string;
  heading?: string;
  description?: string;
  services?: typeof defaultServices;
  isFirstSection?: boolean;
}

export function ServicesSection({
  isSpace = false,
  tagline = "Our Expertise",
  heading = "Comprehensive Solutions for Your Business",
  description = "We offer a wide range of services designed to help you stay ahead in the rapidly evolving digital landscape.",
  services = defaultServices,
  isFirstSection = false,
}: ServicesProps) {
  const showAsFirst = isFirstSection || isSpace;

  return (
    <section id="services" aria-label="Our services" className={cn(
      "relative pb-24 px-6 md:px-12 bg-slate-950",
      showAsFirst ? "pt-28 sm:pt-32" : "py-24"
    )}>
      {/* Background glow effects */}
      <div className="absolute top-1/2 left-0 w-[500px] h-[500px] bg-indigo-500 opacity-[0.015] blur-[150px] rounded-full pointer-events-none transform -translate-y-1/2 -translate-x-1/2" />
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-indigo-500 opacity-[0.015] blur-[150px] rounded-full pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 backdrop-blur-xl border border-white/10 text-indigo-500 text-sm font-bold tracking-widest uppercase mb-6"
          >
            {tagline}
          </motion.div>
          {showAsFirst ? (
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="mt-6 text-4xl md:text-5xl lg:text-6xl font-black text-white tracking-tight leading-tight"
            >
              {heading}
            </motion.h1>
          ) : (
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="mt-6 text-4xl md:text-5xl lg:text-6xl font-black text-white tracking-tight leading-tight"
            >
              {heading}
            </motion.h2>
          )}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="mt-6 text-[#D6D6D6] text-xl font-medium"
          >
            {description}
          </motion.p>
        </div>

        {/* Regular Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {services.map((service, i) => (
            <motion.div
              key={service.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: service.delay, duration: 0.6, ease: "easeOut" }}
              className="group relative overflow-hidden rounded-[2rem] bg-white/5 border border-white/10 p-8 flex flex-col justify-between hover:bg-white/10 hover:border-indigo-500/30 hover:shadow-indigo-500/10 hover:-translate-y-1 transition-all duration-500"
            >
              {/* Inner animated gradient */}
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/0 via-indigo-500/0 to-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />

              <div className="relative z-10 flex flex-col h-full justify-between">
                <div>
                  <div className="w-14 h-14 rounded-2xl bg-slate-950 border border-white/10 flex items-center justify-center text-indigo-500 mb-8 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500">
                    <service.icon className="w-6 h-6" />
                  </div>
                  
                  <h3 className="text-2xl font-bold text-white mb-4 tracking-tight group-hover:text-indigo-400 transition-colors duration-300">
                    {service.title}
                  </h3>
                  <p className="text-slate-400 text-sm leading-relaxed mb-6 font-medium">
                    {service.description}
                  </p>
                </div>
                
                <div>
                  {/* Benefit statement */}
                  <p className="text-indigo-400/90 text-xs font-bold mb-6 tracking-wide">
                    {service.benefit}
                  </p>

                  <Link href="/services" className="inline-flex items-center text-indigo-500 font-bold text-sm uppercase tracking-widest hover:text-white transition-colors group/btn w-fit">
                    {service.cta}
                    <ArrowRight className="w-4 h-4 ml-2 group-hover/btn:translate-x-1 transition-transform duration-300" />
                  </Link>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
