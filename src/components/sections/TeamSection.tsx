"use client";

import { motion } from "framer-motion";
import { X, Globe, Code2 } from "lucide-react";

const defaultTeam = [
  {
    name: "Alex Rivera",
    role: "Founder & Creative Director",
    image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=300",
  },
  {
    name: "Jordan Smith",
    role: "Lead AI Engineer",
    image: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=300",
  },
  {
    name: "Maya Patel",
    role: "Head of Design",
    image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300",
  },
  {
    name: "Leo Zhang",
    role: "Senior Full Stack Dev",
    image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=300",
  },
];

interface TeamProps {
  tagline?: string;
  heading?: string;
  team?: typeof defaultTeam;
}

export function TeamSection({
  tagline = "Our Team",
  heading = "The Minds Behind karmakoders",
  team = defaultTeam,
}: TeamProps) {
  return (
    <section id="team" className="py-32 px-8 md:px-24 bg-slate-950 relative overflow-hidden">
      {/* Background glowing orb */}
      <div className="absolute top-1/2 left-0 w-[600px] h-[600px] bg-indigo-500 opacity-[0.02] blur-[150px] rounded-full pointer-events-none transform -translate-y-1/2 -translate-x-1/4" />
      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-indigo-500 opacity-[0.015] blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="text-center mb-20 flex flex-col items-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 backdrop-blur-xl border border-white/10 text-indigo-500 text-sm font-bold tracking-widest uppercase shadow-indigo-500/10 shadow-[0_0_15px_rgba(var(--color-indigo-500-rgb),0.1)] mb-6"
          >
            {tagline}
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="mt-4 text-4xl md:text-5xl font-black text-white tracking-tight"
          >
            {heading}
          </motion.h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {team.map((member, i) => (
            <motion.div
              key={member.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="group p-4 rounded-[2rem] bg-white/5 border border-white/10 hover:border-indigo-500/30 hover:bg-white/10 hover:-translate-y-2 hover:shadow-[0_10px_30px_rgba(0,0,0,0.3)] transition-all duration-300 flex flex-col"
            >
              <div className="relative rounded-2xl overflow-hidden aspect-[3/4] mb-6">
                <img
                  src={member.image}
                  alt={member.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-indigo-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-3 opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-4 group-hover:translate-y-0">
                  <a href="#" className="w-10 h-10 rounded-full bg-white/10 backdrop-blur flex items-center justify-center text-white hover:bg-indigo-500 hover:text-slate-950 transition-colors duration-300">
                    <X className="w-5 h-5" />
                  </a>
                  <a href="#" className="w-10 h-10 rounded-full bg-white/10 backdrop-blur flex items-center justify-center text-white hover:bg-indigo-500 hover:text-slate-950 transition-colors duration-300">
                    <Globe className="w-5 h-5" />
                  </a>
                  <a href="#" className="w-10 h-10 rounded-full bg-white/10 backdrop-blur flex items-center justify-center text-white hover:bg-indigo-500 hover:text-slate-950 transition-colors duration-300">
                    <Code2 className="w-5 h-5" />
                  </a>
                </div>
              </div>
              
              <div className="px-2 pb-2">
                <h4 className="text-xl font-bold text-white mb-1 group-hover:text-indigo-400 transition-colors duration-300">{member.name}</h4>
                <p className="text-slate-400 text-sm font-medium">{member.role}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
