"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowRight, BarChart } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { getCaseStudies } from "@/lib/actions";

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
  isCentered?: boolean;
  tagline?: string;
  heading?: string;
  cases?: any[];
  limit?: number;
  showViewAll?: boolean;
}

export function CaseStudiesSection({
  isCentered = false,
  tagline = "Case Studies",
  heading = "Real Results for Real Businesses",
  cases: propCases,
  limit = 2,
  showViewAll = true,
}: CaseStudiesProps) {
  const [liveCases, setLiveCases] = useState<any[]>([]);

  useEffect(() => {
    if (!propCases) {
      getCaseStudies()
        .then((data) => {
          if (data && data.length > 0) {
            setLiveCases(data);
          } else {
            setLiveCases(defaultCases);
          }
        })
        .catch((err) => {
          console.error("Failed to load live case studies:", err);
          setLiveCases(defaultCases);
        });
    }
  }, [propCases]);

  const cases = propCases || (liveCases.length > 0 ? liveCases : defaultCases);
  const displayCases = (limit && limit > 0) ? cases.slice(0, limit) : cases;
  return (
    <section id="case-studies" aria-label="Case studies" className={`${!isCentered && "pt-28 sm:pt-32"} pb-20 sm:pb-32 px-4 sm:px-6 md:px-12 bg-slate-950 relative overflow-hidden`}>
      {/* Background glowing orb */}
      <div className="absolute top-1/2 left-0 w-[600px] h-[600px] bg-indigo-500 opacity-[0.02] blur-[150px] rounded-full pointer-events-none transform -translate-y-1/2 -translate-x-1/4" />
      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-indigo-500 opacity-[0.015] blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10">
        <div className={`flex flex-col md:flex-row md:items-end justify-between items-center mb-20 gap-8`}>
          <div className={`text-center max-w-2xl`}>
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 backdrop-blur-xl border border-white/10 text-indigo-500 text-sm font-bold tracking-widest uppercase shadow-indigo-500/10 shadow-[0_0_15px_rgba(var(--color-indigo-500-rgb),0.1)]"
            >
              {tagline}
            </motion.div>
            <motion.h2
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="mt-4 text-4xl md:text-5xl font-black text-white leading-tight tracking-tight"
            >
              {heading}
            </motion.h2>
          </div>
          {showViewAll && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
            >
              <Link href="/case-studies" className="px-8 py-4 bg-white/5 backdrop-blur-xl border border-white/10 hover:border-indigo-500/50 hover:bg-white/10 text-white font-bold rounded-xl transition-all flex items-center group whitespace-nowrap shadow-indigo-500/5 hover:shadow-indigo-500/20">
                View All Case Studies
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform text-indigo-500" />
              </Link>
            </motion.div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {displayCases.map((item, i) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="group cursor-pointer p-6 rounded-[2.5rem] bg-white/5 border border-white/10 hover:border-indigo-500/30 hover:bg-white/10 transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_20px_40px_rgba(0,0,0,0.4)]"
            >
              <Link href={`/blog/${item.slug || "#"}`}>
                <div className="relative rounded-[2rem] overflow-hidden aspect-[16/10] mb-8">
                  <Image
                    src={item.image || "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=800"}
                    alt={item.title}
                    fill
                    sizes="(max-width: 1024px) 100vw, 50vw"
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                    {...(i < 2 ? { priority: true } : { loading: "lazy" as const })}
                  />
                  <div className={`absolute inset-0 bg-gradient-to-br ${item.color || "from-indigo-600 to-purple-600"} opacity-40 mix-blend-multiply`} />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />

                  <div className="absolute bottom-8 left-8 right-8 flex items-end justify-between">
                    <div>
                      <div className="text-white/60 text-sm font-bold uppercase tracking-widest mb-1">{item.category || item.client || "Success Story"}</div>
                      <h3 className="text-3xl font-black text-white">{item.title}</h3>
                    </div>
                    <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/20 text-center">
                      <div className="text-xs text-white/60 uppercase font-bold mb-1">Impact</div>
                      <div className="text-xl font-bold text-white">{item.result || "Outstanding"}</div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between px-4">
                  <div className="flex items-center gap-2 text-slate-400 font-bold group-hover:text-indigo-400 transition-colors">
                    <BarChart className="w-5 h-5 text-indigo-500" />
                    Read Full Success Story
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white group-hover:bg-indigo-500 group-hover:text-slate-950 group-hover:border-indigo-500 transition-all duration-300 shadow-indigo-500/5 group-hover:shadow-indigo-500/20">
                    <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
