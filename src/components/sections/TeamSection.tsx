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
    <section id="team" className="py-32 px-8 md:px-24 bg-slate-950">
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
            className="mt-4 text-4xl md:text-5xl font-bold text-white"
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
              className="group"
            >
              <div className="relative rounded-3xl overflow-hidden aspect-[3/4] mb-6">
                <img
                  src={member.image}
                  alt={member.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-indigo-600/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-3 opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-4 group-hover:translate-y-0">
                  <a href="#" className="w-10 h-10 rounded-full bg-white/10 backdrop-blur flex items-center justify-center text-white hover:bg-white/20 transition-colors">
                    <X className="w-5 h-5" />
                  </a>
                  <a href="#" className="w-10 h-10 rounded-full bg-white/10 backdrop-blur flex items-center justify-center text-white hover:bg-white/20 transition-colors">
                    <Globe className="w-5 h-5" />
                  </a>
                  <a href="#" className="w-10 h-10 rounded-full bg-white/10 backdrop-blur flex items-center justify-center text-white hover:bg-white/20 transition-colors">
                    <Code2 className="w-5 h-5" />
                  </a>
                </div>
              </div>
              
              <h4 className="text-xl font-bold text-white mb-1">{member.name}</h4>
              <p className="text-slate-500 text-sm">{member.role}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
