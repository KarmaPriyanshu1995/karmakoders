"use client";

import { motion } from "framer-motion";
import { ArrowRight, Briefcase, MapPin, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

const defaultJobs = [
  {
    title: "Senior AI Engineer",
    location: "Remote / SF",
    type: "Full-time",
    department: "Engineering",
  },
  {
    title: "Lead UI Designer",
    location: "Remote / NY",
    type: "Full-time",
    department: "Design",
  },
  {
    title: "Full Stack Developer",
    location: "Remote",
    type: "Full-time",
    department: "Engineering",
  },
  {
    title: "Product Manager",
    location: "London",
    type: "Full-time",
    department: "Product",
  },
];

interface CareersProps {
  tagline?: string;
  heading?: string;
  description?: string;
  jobs?: typeof defaultJobs;
}

export function CareersSection({
  tagline = "Join Our Team",
  heading = "Help Us Shape the Future of the Web",
  description = "We're always looking for talented individuals who are passionate about design, engineering, and artificial intelligence.",
  jobs = defaultJobs,
}: CareersProps) {
  return (
    <section id="careers" className="py-32 px-8 md:px-24 bg-slate-950">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col lg:flex-row gap-20 items-start">
          <div className="lg:w-1/3 lg:sticky lg:top-32">
            <motion.span
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="text-indigo-400 text-sm font-semibold uppercase tracking-widest"
            >
              {tagline}
            </motion.span>
            <motion.h2
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="mt-4 text-4xl font-bold text-white leading-tight"
            >
              {heading}
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="mt-6 text-slate-400 text-lg leading-relaxed"
            >
              {description}
            </motion.p>
            
            <div className="mt-10">
              <div className="p-6 rounded-2xl bg-indigo-600/10 border border-indigo-500/20">
                <h4 className="text-white font-bold mb-2">Don&apos;t see a fit?</h4>
                <p className="text-slate-400 text-sm mb-4">Send us an open application and we&apos;ll keep you in mind for future roles.</p>
                <Button className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl">
                  Open Application
                </Button>
              </div>
            </div>
          </div>
          
          <div className="lg:w-2/3 w-full space-y-4">
            {jobs.map((job, i) => (
              <motion.div
                key={job.title}
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="group p-8 rounded-3xl border border-slate-800 bg-slate-900/40 hover:border-indigo-500/50 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-6 cursor-pointer"
              >
                <div>
                  <div className="text-indigo-400 text-xs font-bold uppercase tracking-widest mb-2">{job.department}</div>
                  <h3 className="text-2xl font-bold text-white mb-4 group-hover:text-indigo-400 transition-colors">{job.title}</h3>
                  <div className="flex flex-wrap gap-6 text-slate-500 text-sm">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      {job.location}
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      {job.type}
                    </div>
                  </div>
                </div>
                
                <div className="w-12 h-12 rounded-full border border-slate-700 flex items-center justify-center text-white group-hover:bg-indigo-600 group-hover:border-indigo-600 transition-all">
                  <ArrowRight className="w-6 h-6" />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
