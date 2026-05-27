"use client";

import { motion } from "framer-motion";

const partners = [
  { name: "Google Cloud", logo: "G" },
  { name: "Microsoft Azure", logo: "M" },
  { name: "Vercel", logo: "▲" },
  { name: "OpenAI", logo: "AI" },
  { name: "Stripe", logo: "S" },
  { name: "Shopify", logo: "◆" },
  { name: "Figma", logo: "F" },
  { name: "Supabase", logo: "⚡" },
  { name: "AWS", logo: "AWS" },
  { name: "Prisma", logo: "P" },
  { name: "Twilio", logo: "T" },
  { name: "HubSpot", logo: "H" },
];

// Duplicated for seamless infinite scroll
const row1 = [...partners.slice(0, 6), ...partners.slice(0, 6)];
const row2 = [...partners.slice(6), ...partners.slice(6)];

export function PartnersSection() {
  return (
    <section id="partners" className="py-24 bg-slate-950 relative overflow-hidden border-y border-white/5">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--color-slate-950)_0%,transparent_10%,transparent_90%,var(--color-slate-950)_100%)] pointer-events-none z-10" />

      <div className="max-w-7xl mx-auto px-6 md:px-12 mb-16 text-center relative z-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 backdrop-blur-xl border border-white/10 text-indigo-500 text-sm font-bold tracking-widest uppercase mb-6"
        >
          Trusted Partnerships
        </motion.div>
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="text-4xl md:text-5xl font-black text-white tracking-tight mb-4"
        >
          Companies That Trust Us
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="text-[#D6D6D6] text-lg max-w-2xl mx-auto font-medium"
        >
          We partner with industry-leading platforms and enterprise companies to deliver best-in-class solutions.
        </motion.p>
      </div>

      {/* Scrolling Row 1 — Left to Right */}
      <div className="flex overflow-hidden mb-6 relative z-0">
        <motion.div
          className="flex gap-6 shrink-0"
          animate={{ x: ["0%", "-50%"] }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
        >
          {row1.map((partner, i) => (
            <div
              key={`r1-${i}`}
              className="flex items-center gap-4 px-8 py-5 rounded-2xl bg-white/5 border border-white/10 shrink-0 hover:border-indigo-500/40 hover:bg-white/10 transition-all duration-300 group cursor-default"
            >
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500 font-black text-sm group-hover:bg-indigo-500 group-hover:text-slate-950 transition-all">
                {partner.logo}
              </div>
              <span className="text-[#D6D6D6] font-bold text-lg whitespace-nowrap group-hover:text-white transition-colors">{partner.name}</span>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Scrolling Row 2 — Right to Left */}
      <div className="flex overflow-hidden relative z-0">
        <motion.div
          className="flex gap-6 shrink-0"
          animate={{ x: ["-50%", "0%"] }}
          transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
        >
          {row2.map((partner, i) => (
            <div
              key={`r2-${i}`}
              className="flex items-center gap-4 px-8 py-5 rounded-2xl bg-white/5 border border-white/10 shrink-0 hover:border-indigo-500/40 hover:bg-white/10 transition-all duration-300 group cursor-default"
            >
              <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center text-white font-black text-sm group-hover:bg-indigo-500 group-hover:text-slate-950 group-hover:border-indigo-500 transition-all">
                {partner.logo}
              </div>
              <span className="text-[#D6D6D6] font-bold text-lg whitespace-nowrap group-hover:text-white transition-colors">{partner.name}</span>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
