"use client";

import { motion } from "framer-motion";
import { Code2, Palette, Globe2, BarChart3, ShieldCheck, Smartphone, ArrowRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const defaultServices = [
  {
    icon: Palette,
    title: "UI/UX Design & Branding",
    description: "Creating visually stunning, cyberpunk-minimal interfaces that resonate with elite audiences. We build design systems that scale and look breathtaking.",
    className: "md:col-span-2 md:row-span-2",
    delay: 0.1,
  },
  {
    icon: Code2,
    title: "Web Engineering",
    description: "Scalable, high-performance apps using Next.js & React.",
    className: "md:col-span-1 md:row-span-1",
    delay: 0.2,
  },
  {
    icon: Globe2,
    title: "AI Automation",
    description: "Cutting-edge AI agents to automate your workflows.",
    className: "md:col-span-1 md:row-span-1",
    delay: 0.3,
  },
  {
    icon: Smartphone,
    title: "Mobile Solutions",
    description: "Native-feeling mobile experiences for iOS and Android.",
    className: "md:col-span-1",
    delay: 0.4,
  },
  {
    icon: BarChart3,
    title: "Growth & Analytics",
    description: "Data-driven strategies and predictive AI models to scale your brand.",
    className: "md:col-span-2",
    delay: 0.5,
  },
  {
    icon: ShieldCheck,
    title: "Enterprise Cyber Security",
    description: "Zero-trust architectures and continuous monitoring to ensure your digital assets remain impenetrable against modern threats.",
    className: "md:col-span-3",
    delay: 0.6,
  },
];

interface ServicesProps {
  isSpace?: boolean;
  tagline?: string;
  heading?: string;
  description?: string;
  services?: typeof defaultServices;
}

export function ServicesSection({
  isSpace = false,
  tagline = "Our Expertise",
  heading = "Comprehensive Solutions for Your Business",
  description = "We offer a wide range of services designed to help you stay ahead in the rapidly evolving digital landscape.",
  services = defaultServices,
}: ServicesProps) {
  return (
    <section id="services" aria-label="Our services" className={`relative ${isSpace ? "pt-28 sm:pt-32" : "mt-24"} pb-20 sm:pb-32 px-4 sm:px-6 md:px-12 bg-slate-950`}>
      {/* Background glow effects */}
      <div className="absolute top-1/2 left-0 w-[500px] h-[500px] bg-indigo-500 opacity-5 blur-[150px] rounded-full pointer-events-none transform -translate-y-1/2 -translate-x-1/2" />
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-indigo-500 opacity-[0.03] blur-[150px] rounded-full pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 backdrop-blur-xl border border-white/10 text-indigo-500 text-sm font-bold tracking-widest uppercase shadow-indigo-500/10 shadow-[0_0_15px_rgba(var(--color-indigo-500-rgb),0.1)]"
          >
            {tagline}
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="mt-6 text-5xl md:text-6xl font-black text-white tracking-tight"
          >
            {heading}
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="mt-6 text-[#D6D6D6] text-xl max-w-2xl mx-auto"
          >
            {description}
          </motion.p>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 auto-rows-min gap-6">
          {services.map((service, i) => (
            <motion.div
              key={service.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: service.delay, duration: 0.6, ease: "easeOut" }}
              className={cn(
                "group relative overflow-hidden rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 p-8 flex flex-col justify-between transition-all duration-500 hover:bg-white/10 hover:border-indigo-500/30 hover:shadow-indigo-500/10 hover:-translate-y-1",
                service.className
              )}
            >
              {/* Inner animated gradient */}
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/0 via-indigo-500/0 to-indigo-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />

              <div className="relative z-10 flex flex-col h-full">
                <div className="w-16 h-16 rounded-2xl bg-slate-950/80 border border-white/10 flex items-center justify-center text-indigo-500 mb-8 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500 shadow-indigo-500/10 group-hover:shadow-indigo-500/30">
                  <service.icon className="w-8 h-8" />
                </div>
                
                <div className="mt-auto">
                  <h3 className="text-2xl md:text-3xl font-bold text-white mb-4 tracking-tight group-hover:text-indigo-500 transition-colors duration-300">
                    {service.title}
                  </h3>
                  <p className="text-[#D6D6D6] text-lg leading-relaxed mb-8 font-medium">
                    {service.description}
                  </p>
                  
                  <Link href="/services" className="inline-flex items-center text-indigo-500 font-bold text-sm uppercase tracking-widest hover:text-white transition-colors group/btn w-fit">
                    Explore Service
                    <ArrowRight className="w-5 h-5 ml-2 group-hover/btn:translate-x-2 transition-transform duration-300" />
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
