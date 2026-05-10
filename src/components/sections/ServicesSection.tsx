"use client";

import { motion } from "framer-motion";
import { Code2, Palette, Globe2, BarChart3, ShieldCheck, Smartphone } from "lucide-react";
import Link from "next/link";

const defaultServices = [
  {
    icon: Palette,
    title: "UI/UX Design",
    description: "Creating visually stunning and highly intuitive interfaces that resonate with your target audience.",
    gradient: "from-pink-500 to-rose-500",
  },
  {
    icon: Code2,
    title: "Web Development",
    description: "Building scalable, high-performance web applications using modern frameworks like Next.js and React.",
    gradient: "from-indigo-500 to-blue-500",
  },
  {
    icon: Globe2,
    title: "AI Integration",
    description: "Leveraging cutting-edge AI technologies to automate workflows and enhance user experiences.",
    gradient: "from-cyan-500 to-teal-500",
  },
  {
    icon: Smartphone,
    title: "Mobile Solutions",
    description: "Developing responsive and native-feeling mobile experiences for iOS and Android platforms.",
    gradient: "from-amber-500 to-orange-500",
  },
  {
    icon: BarChart3,
    title: "Digital Marketing",
    description: "Driving growth through data-driven marketing strategies, SEO optimization, and content creation.",
    gradient: "from-emerald-500 to-green-500",
  },
  {
    icon: ShieldCheck,
    title: "Cyber Security",
    description: "Ensuring your digital assets are protected with enterprise-grade security and robust architecture.",
    gradient: "from-purple-500 to-violet-500",
  },
];

interface ServicesProps {
  tagline?: string;
  heading?: string;
  description?: string;
  services?: typeof defaultServices;
}

export function ServicesSection({
  tagline = "Our Expertise",
  heading = "Comprehensive Solutions for Your Business",
  description = "We offer a wide range of services designed to help you stay ahead in the rapidly evolving digital landscape.",
  services = defaultServices,
}: ServicesProps) {
  return (
    <section id="services" className="relative py-32 px-8 md:px-24 bg-slate-950">
      <div className="max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-20">
          <motion.span
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-indigo-400 text-sm font-semibold uppercase tracking-widest"
          >
            {tagline}
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="mt-4 text-4xl md:text-5xl font-bold text-white"
          >
            {heading}
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="mt-6 text-slate-400 text-lg"
          >
            {description}
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {services.map((service, i) => (
            <motion.div
              key={service.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="p-8 rounded-3xl bg-slate-900/40 border border-slate-800 hover:border-indigo-500/50 transition-all group relative overflow-hidden"
            >
              <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${service.gradient} opacity-0 group-hover:opacity-10 blur-2xl transition-opacity`} />
              
              <div className="w-14 h-14 rounded-2xl bg-slate-800 flex items-center justify-center text-white mb-6 group-hover:scale-110 transition-transform">
                <service.icon className="w-7 h-7" />
              </div>
              
              <h3 className="text-2xl font-bold text-white mb-4">{service.title}</h3>
              <p className="text-slate-400 leading-relaxed">
                {service.description}
              </p>
              
              <div className="mt-8">
                <Link href="/services" className="text-indigo-400 font-semibold inline-flex items-center group/link">
                  Learn More 
                  <svg className="w-4 h-4 ml-2 group-hover/link:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
