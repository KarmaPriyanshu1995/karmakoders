"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const techStack = [
  // Frontend
  { name: "Next.js", category: "Frontend", icon: "▲", color: "text-white", bg: "bg-white/10" },
  { name: "React", category: "Frontend", icon: "⚛", color: "text-cyan-400", bg: "bg-cyan-500/10" },
  { name: "TypeScript", category: "Frontend", icon: "TS", color: "text-blue-400", bg: "bg-blue-500/10" },
  { name: "Tailwind CSS", category: "Frontend", icon: "🌊", color: "text-teal-400", bg: "bg-teal-500/10" },
  { name: "Framer Motion", category: "Frontend", icon: "◈", color: "text-pink-400", bg: "bg-pink-500/10" },
  { name: "Three.js", category: "Frontend", icon: "◉", color: "text-indigo-500", bg: "bg-indigo-500/10" },

  // Backend
  { name: "Node.js", category: "Backend", icon: "🟢", color: "text-green-400", bg: "bg-green-500/10" },
  { name: "NestJS", category: "Backend", icon: "🐱", color: "text-red-400", bg: "bg-red-500/10" },
  { name: "Python", category: "Backend", icon: "🐍", color: "text-yellow-400", bg: "bg-yellow-500/10" },
  { name: "GraphQL", category: "Backend", icon: "◈", color: "text-pink-500", bg: "bg-pink-500/10" },

  // Mobile
  { name: "React Native", category: "Mobile", icon: "📱", color: "text-cyan-300", bg: "bg-cyan-400/10" },
  { name: "Swift", category: "Mobile", icon: "🍎", color: "text-orange-400", bg: "bg-orange-500/10" },
  { name: "Kotlin", category: "Mobile", icon: "🤖", color: "text-purple-400", bg: "bg-purple-500/10" },
  { name: "Flutter", category: "Mobile", icon: "💙", color: "text-blue-400", bg: "bg-blue-500/10" },

  // Cloud
  { name: "AWS", category: "Cloud", icon: "☁", color: "text-orange-400", bg: "bg-orange-500/10" },
  { name: "Google Cloud", category: "Cloud", icon: "☁", color: "text-blue-400", bg: "bg-blue-500/10" },
  { name: "Azure", category: "Cloud", icon: "☁", color: "text-sky-400", bg: "bg-sky-500/10" },
  { name: "Cloudflare", category: "Cloud", icon: "⚡", color: "text-yellow-500", bg: "bg-yellow-500/10" },

  // Database
  { name: "PostgreSQL", category: "Database", icon: "🐘", color: "text-blue-300", bg: "bg-blue-400/10" },
  { name: "MongoDB", category: "Database", icon: "🍃", color: "text-green-500", bg: "bg-green-500/10" },
  { name: "Redis", category: "Database", icon: "⚡", color: "text-red-400", bg: "bg-red-500/10" },
  { name: "Prisma ORM", category: "Database", icon: "◆", color: "text-emerald-400", bg: "bg-emerald-500/10" },

  // AI
  { name: "OpenAI GPT-4", category: "AI", icon: "🤖", color: "text-green-400", bg: "bg-green-500/10" },
  { name: "TensorFlow", category: "AI", icon: "🔶", color: "text-orange-500", bg: "bg-orange-500/10" },
  { name: "LangChain", category: "AI", icon: "🦜", color: "text-green-300", bg: "bg-green-400/10" },
  { name: "PyTorch", category: "AI", icon: "🔥", color: "text-rose-500", bg: "bg-rose-500/10" },

  // DevOps
  { name: "Docker", category: "DevOps", icon: "🐳", color: "text-sky-400", bg: "bg-sky-500/10" },
  { name: "Kubernetes", category: "DevOps", icon: "☸", color: "text-blue-500", bg: "bg-blue-500/10" },
  { name: "Vercel", category: "DevOps", icon: "▲", color: "text-white", bg: "bg-white/10" },
  { name: "GitHub Actions", category: "DevOps", icon: "🐙", color: "text-slate-400", bg: "bg-slate-500/10" },
];

const categories = ["All", "Frontend", "Backend", "Mobile", "Cloud", "Database", "AI", "DevOps"];

export function TechStackSection() {
  const [selectedCategory, setSelectedCategory] = useState("All");

  const filteredTech = selectedCategory === "All"
    ? techStack
    : techStack.filter((tech) => tech.category === selectedCategory);

  return (
    <section id="tech-stack" aria-label="Technology stack" className="py-24 px-4 sm:px-6 md:px-12 bg-slate-950 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-indigo-500 opacity-[0.015] blur-[150px] rounded-full pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 backdrop-blur-xl border border-white/10 text-indigo-500 text-sm font-bold tracking-widest uppercase mb-6"
          >
            Our Tech Arsenal
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-5xl lg:text-6xl font-black text-white tracking-tight leading-tight mb-4"
          >
            Built With Best-in-Class Frameworks
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-[#D6D6D6] text-xl max-w-2xl mx-auto font-medium"
          >
            We use cutting-edge tools and battle-tested frameworks to build solutions that scale to millions.
          </motion.p>
        </div>

        {/* Filter Categories */}
        <div className="flex flex-wrap justify-center gap-2 mb-12 border-b border-white/5 pb-6" role="tablist" aria-label="Technology categories">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
                selectedCategory === cat
                  ? "bg-indigo-500 text-slate-950 shadow-indigo-500/25 shadow-[0_0_15px_var(--color-indigo-500)]"
                  : "bg-white/5 text-slate-400 border border-white/5 hover:text-white hover:bg-white/10"
              }`}
              role="tab"
              aria-selected={selectedCategory === cat}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Tech Grid */}
        <motion.div
          layout
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 min-h-[300px] items-start"
        >
          <AnimatePresence mode="popLayout">
            {filteredTech.map((tech, i) => (
              <motion.div
                key={tech.name}
                layout
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.85 }}
                transition={{ duration: 0.3 }}
                className="group flex flex-col items-center justify-center h-36 w-full p-5 rounded-2xl bg-slate-900/40 backdrop-blur-md border border-white/5 hover:border-indigo-500/30 hover:bg-slate-900/60 hover:-translate-y-1.5 hover:shadow-[0_15px_30px_rgba(0,0,0,0.5)] transition-all duration-300 cursor-default"
              >
                <div className={`w-12 h-12 rounded-xl ${tech.bg} flex items-center justify-center ${tech.color} font-black text-lg border border-white/5 group-hover:scale-110 transition-transform duration-300 mb-2`}>
                  {tech.icon}
                </div>
                <div className="text-center">
                  <p className="text-white font-bold text-sm leading-tight group-hover:text-indigo-400 transition-colors">{tech.name}</p>
                  <p className="text-slate-500 text-xs mt-1 font-semibold">{tech.category}</p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>

        {/* Bottom Stats */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-6"
        >
          {[
            { value: "30+", label: "Technologies Mastered" },
            { value: "5+", label: "Years of R&D" },
            { value: "99.99%", label: "Uptime Guarantee" },
            { value: "24/7", label: "Monitoring & Support" },
          ].map((stat) => (
            <div key={stat.label} className="text-center p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-indigo-500/30 transition-colors group">
              <p className="text-4xl font-black text-white group-hover:text-indigo-500 transition-colors mb-2">{stat.value}</p>
              <p className="text-slate-400 text-sm font-semibold">{stat.label}</p>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
