"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Briefcase, MapPin, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getJobs } from "@/lib/actions";
import Link from "next/link";

const defaultJobs = [
  {
    title: "Senior AI Engineer",
    location: "Remote / SF",
    type: "Full-time",
    department: "Engineering",
    slug: "senior-ai-engineer",
  },
  {
    title: "Lead UI Designer",
    location: "Remote / NY",
    type: "Full-time",
    department: "Design",
    slug: "lead-ui-designer",
  },
  {
    title: "Full Stack Developer",
    location: "Remote",
    type: "Full-time",
    department: "Engineering",
    slug: "full-stack-developer",
  },
  {
    title: "Product Manager",
    location: "London",
    type: "Full-time",
    department: "Product",
    slug: "product-manager",
  },
];

interface CareersProps {
  tagline?: string;
  heading?: string;
  description?: string;
  jobs?: any[];
  isFirstSection?: boolean;
}

export function CareersSection({
  tagline = "Join Our Team",
  heading = "Shape the Future of AI & Design",
  description = "We're always looking for visionary talent passionate about design, engineering, and artificial intelligence.",
  jobs: propJobs,
  isFirstSection = false,
}: CareersProps) {
  const [liveJobs, setLiveJobs] = useState<any[]>([]);

  useEffect(() => {
    if (!propJobs) {
      getJobs()
        .then((data) => {
          if (data && data.length > 0) {
            setLiveJobs(data);
          } else {
            setLiveJobs(defaultJobs);
          }
        })
        .catch((err) => {
          console.error("Failed to load live jobs:", err);
          setLiveJobs(defaultJobs);
        });
    }
  }, [propJobs]);

  const jobs = propJobs || (liveJobs.length > 0 ? liveJobs : defaultJobs);

  return (
    <section id="careers" className="py-32 px-6 md:px-12 bg-slate-950 relative overflow-hidden">
      {/* Glow background */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500 opacity-[0.02] blur-[150px] pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="flex flex-col lg:flex-row gap-20 items-start">
          <div className="lg:w-1/3 lg:sticky lg:top-32">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 backdrop-blur-xl border border-white/10 text-indigo-500 text-sm font-bold tracking-widest uppercase shadow-indigo-500/10 shadow-[0_0_15px_rgba(99,102,241,0.1)] mb-6"
            >
              {tagline}
            </motion.div>
            {isFirstSection ? (
              <motion.h1
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
                className="text-5xl md:text-6xl font-black text-white leading-tight tracking-tight"
              >
                {heading}
              </motion.h1>
            ) : (
              <motion.h2
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
                className="text-5xl md:text-6xl font-black text-white leading-tight tracking-tight"
              >
                {heading}
              </motion.h2>
            )}
            <motion.p
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="mt-6 text-[#D6D6D6] text-lg leading-relaxed font-medium"
            >
              {description}
            </motion.p>
            
            <div className="mt-12">
              <div className="p-8 rounded-[2rem] bg-white/5 border border-white/10 backdrop-blur-xl hover:border-indigo-500/30 transition-colors duration-300">
                <h4 className="text-white font-bold text-xl mb-3">Don&apos;t see a fit?</h4>
                <p className="text-[#D6D6D6] text-sm mb-6 leading-relaxed">Send us an open application and we&apos;ll keep you in mind for future elite roles.</p>
                <Button className="w-full h-14 bg-indigo-500 hover:bg-indigo-500/90 text-slate-950 font-bold rounded-xl transition-all shadow-[0_0_20px_rgba(99,102,241,0.3)] hover:shadow-[0_0_30px_rgba(99,102,241,0.5)]">
                  Open Application
                </Button>
              </div>
            </div>
          </div>
          
          <div className="lg:w-2/3 w-full space-y-6">
            {jobs.map((job, i) => (
              <Link href={`/careers/${job.slug || "#"}`} key={job.title} className="block">
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1, duration: 0.5 }}
                  className="group p-8 md:p-10 rounded-[2rem] border border-white/10 bg-white/5 backdrop-blur-xl hover:bg-white/10 hover:border-indigo-500/30 hover:shadow-indigo-500/10 transition-all duration-500 flex flex-col sm:flex-row sm:items-center justify-between gap-6 cursor-pointer"
                >
                  <div>
                    <div className="text-indigo-500 text-xs font-bold uppercase tracking-widest mb-3">{job.department}</div>
                    <h3 className="text-3xl font-bold text-white mb-5 group-hover:text-indigo-400 transition-colors duration-300">{job.title}</h3>
                    <div className="flex flex-wrap gap-6 text-[#D6D6D6] text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-indigo-500" />
                        {job.location}
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-indigo-500" />
                        {job.type}
                      </div>
                    </div>
                  </div>
                  
                  <div className="w-14 h-14 rounded-full border border-white/20 flex items-center justify-center text-white group-hover:bg-indigo-500 group-hover:text-slate-950 group-hover:border-indigo-500 transition-all duration-300 shadow-lg group-hover:shadow-[0_0_20px_rgba(99,102,241,0.4)]">
                    <ArrowRight className="w-6 h-6 group-hover:-rotate-45 transition-transform duration-300" />
                  </div>
                </motion.div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
