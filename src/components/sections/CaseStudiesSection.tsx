"use client";

import { motion } from "framer-motion";
import { ArrowRight, BarChart } from "lucide-react";

const defaultCases = [
  {
    title: "Revolutionizing Fintech UX",
    client: "Quantum Pay",
    result: "+240% Engagement",
    image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=800",
    color: "from-blue-600 to-cyan-600",
  },
  {
    title: "AI-Driven Health Diagnostics",
    client: "Nova Health",
    result: "99.9% Accuracy",
    image: "https://images.unsplash.com/photo-1504868584819-f8eec0421d50?auto=format&fit=crop&q=80&w=800",
    color: "from-emerald-600 to-teal-600",
  },
];

interface CaseStudiesProps {
  tagline?: string;
  heading?: string;
  cases?: typeof defaultCases;
}

export function CaseStudiesSection({
  tagline = "Case Studies",
  heading = "Real Results for Real Businesses",
  cases = defaultCases,
}: CaseStudiesProps) {
  return (
    <section id="case-studies" className="py-32 px-8 md:px-24 bg-slate-950">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-20">
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
            className="mt-4 text-4xl md:text-5xl font-bold text-white max-w-2xl mx-auto"
          >
            {heading}
          </motion.h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {cases.map((item, i) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="group cursor-pointer"
            >
              <div className="relative rounded-[40px] overflow-hidden aspect-[16/10] mb-8">
                <img
                  src={item.image}
                  alt={item.title}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className={`absolute inset-0 bg-gradient-to-br ${item.color} opacity-40 mix-blend-multiply`} />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
                
                <div className="absolute bottom-8 left-8 right-8 flex items-end justify-between">
                  <div>
                    <div className="text-white/60 text-sm font-bold uppercase tracking-widest mb-1">{item.client}</div>
                    <h3 className="text-3xl font-bold text-white">{item.title}</h3>
                  </div>
                  <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/20 text-center">
                    <div className="text-xs text-white/60 uppercase font-bold mb-1">Result</div>
                    <div className="text-xl font-bold text-white">{item.result}</div>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-between px-4">
                <div className="flex items-center gap-2 text-slate-400 font-medium">
                  <BarChart className="w-5 h-5 text-indigo-500" />
                  Read Full Success Story
                </div>
                <div className="w-12 h-12 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-white group-hover:bg-indigo-600 group-hover:border-indigo-600 transition-all">
                  <ArrowRight className="w-6 h-6" />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
