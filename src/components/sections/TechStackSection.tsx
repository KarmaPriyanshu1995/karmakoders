"use client";

import { motion } from "framer-motion";

const techStack = [
  { name: "Next.js", category: "Framework", icon: "▲", color: "text-white", bg: "bg-white/10" },
  { name: "React", category: "UI Library", icon: "⚛", color: "text-cyan-400", bg: "bg-cyan-500/10" },
  { name: "TypeScript", category: "Language", icon: "TS", color: "text-blue-400", bg: "bg-blue-500/10" },
  { name: "Tailwind CSS", category: "Styling", icon: "🌊", color: "text-teal-400", bg: "bg-teal-500/10" },
  { name: "Framer Motion", category: "Animation", icon: "◈", color: "text-pink-400", bg: "bg-pink-500/10" },
  { name: "Three.js", category: "3D Engine", icon: "◉", color: "text-indigo-500", bg: "bg-indigo-500/10" },
  { name: "Prisma ORM", category: "Database", icon: "◆", color: "text-emerald-400", bg: "bg-emerald-500/10" },
  { name: "PostgreSQL", category: "Database", icon: "🐘", color: "text-blue-300", bg: "bg-blue-400/10" },
  { name: "OpenAI GPT-4", category: "AI", icon: "🤖", color: "text-green-400", bg: "bg-green-500/10" },
  { name: "Vercel", category: "Deployment", icon: "▲", color: "text-white", bg: "bg-white/10" },
  { name: "Docker", category: "DevOps", icon: "🐳", color: "text-sky-400", bg: "bg-sky-500/10" },
  { name: "GraphQL", category: "API", icon: "◈", color: "text-pink-500", bg: "bg-pink-500/10" },
  { name: "Redis", category: "Cache", icon: "⚡", color: "text-red-400", bg: "bg-red-500/10" },
  { name: "Stripe", category: "Payments", icon: "💳", color: "text-violet-400", bg: "bg-violet-500/10" },
  { name: "AWS S3", category: "Storage", icon: "☁", color: "text-orange-400", bg: "bg-orange-500/10" },
  { name: "React Native", category: "Mobile", icon: "📱", color: "text-cyan-300", bg: "bg-cyan-400/10" },
];

const categories = ["All", "Framework", "Language", "AI", "Database", "DevOps", "Mobile"];

export function TechStackSection() {
  return (
    <section id="tech-stack" className="py-32 px-6 md:px-12 bg-slate-950 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-indigo-500 opacity-[0.025] blur-[150px] rounded-full pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="text-center mb-20">
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
            className="text-5xl md:text-6xl font-black text-white tracking-tight mb-4"
          >
            Built With Best-in-Class<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-indigo-400">Frameworks</span>
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

        {/* Tech Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-8 gap-4">
          {techStack.map((tech, i) => (
            <motion.div
              key={tech.name}
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              whileInView={{ opacity: 1, scale: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.04, duration: 0.4, ease: "easeOut" }}
              className="group flex flex-col items-center gap-3 p-5 rounded-2xl bg-white/5 border border-white/10 hover:border-indigo-500/40 hover:bg-white/10 hover:-translate-y-2 hover:shadow-[0_10px_30px_rgba(0,0,0,0.3)] transition-all duration-300 cursor-default"
            >
              <div className={`w-12 h-12 rounded-xl ${tech.bg} flex items-center justify-center ${tech.color} font-black text-lg border border-white/5 group-hover:scale-110 transition-transform duration-300`}>
                {tech.icon}
              </div>
              <div className="text-center">
                <p className="text-white font-bold text-xs leading-tight group-hover:text-indigo-500 transition-colors">{tech.name}</p>
                <p className="text-slate-500 text-xs mt-0.5">{tech.category}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Bottom Stats */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
          className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-6"
        >
          {[
            { value: "16+", label: "Technologies Mastered" },
            { value: "5+", label: "Years of R&D" },
            { value: "99.9%", label: "Uptime Guarantee" },
            { value: "24/7", label: "Monitoring & Support" },
          ].map((stat) => (
            <div key={stat.label} className="text-center p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-indigo-500/30 transition-colors group">
              <p className="text-4xl font-black text-white group-hover:text-indigo-500 transition-colors mb-2">{stat.value}</p>
              <p className="text-[#D6D6D6] text-sm font-medium">{stat.label}</p>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
