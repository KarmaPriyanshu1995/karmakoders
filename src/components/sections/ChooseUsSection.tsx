"use client";

import { motion } from "framer-motion";
import { Clock, ShieldCheck, DollarSign, UserCheck, ArrowRight } from "lucide-react";
import Link from "next/link";

const defaultCards = [
  {
    icon: Clock,
    title: "Real-Time Availability",
    description: "Full daily overlap with EST/PST time zones. We conduct daily stand-ups, live Slack/Teams updates, and fast responses so communication is completely seamless.",
    delay: 0.1,
  },
  {
    icon: ShieldCheck,
    title: "Compliance-Aware Engineering",
    description: "We build digital products following strict US standards, including HIPAA compliance for healthcare, GDPR/CCPA for data privacy, and secure SOC 2 frameworks.",
    delay: 0.2,
  },
  {
    icon: DollarSign,
    title: "Transparent USD Pricing",
    description: "No hidden fees, currency exchange risks, or complex billing sheets. We contract securely under Delaware law with clear milestone-based pricing in USD.",
    delay: 0.3,
  },
  {
    icon: UserCheck,
    title: "Dedicated Project Manager",
    description: "Every account is assigned a timezone-aligned Project Manager. They lead agile sprints, coordinate engineers, and keep you continuously informed of progress.",
    delay: 0.4,
  },
];

interface ChooseUsProps {
  tagline?: string;
  heading?: string;
  cards?: typeof defaultCards;
}

export function ChooseUsSection({
  tagline = "Why Choose KarmaKoders",
  heading = "Built for the US Market. Engineered Without Compromise.",
  cards = defaultCards,
}: ChooseUsProps) {
  return (
    <section id="why-choose-us" aria-label="Why choose us" className="py-24 px-4 sm:px-6 md:px-12 bg-slate-950 relative overflow-hidden">
      {/* Glow effects */}
      <div className="absolute top-1/2 left-0 w-[450px] h-[450px] bg-indigo-500 opacity-[0.01] blur-[140px] rounded-full pointer-events-none transform -translate-y-1/2" />
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500 opacity-[0.015] blur-[150px] rounded-full pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 backdrop-blur-xl border border-white/10 text-indigo-500 text-sm font-bold tracking-widest uppercase mb-6"
          >
            {tagline}
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-5xl lg:text-6xl font-black text-white tracking-tight leading-tight"
          >
            {heading}
          </motion.h2>
        </div>

        {/* Value Proposition Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
          {cards.map((card, i) => (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: card.delay, duration: 0.5, ease: "easeOut" }}
              className="group p-8 rounded-[2rem] bg-white/5 border border-white/10 hover:border-indigo-500/30 hover:bg-white/10 hover:-translate-y-2 hover:shadow-[0_10px_30px_rgba(0,0,0,0.3)] transition-all duration-300 flex flex-col justify-between"
            >
              <div>
                {/* Icon box */}
                <div className="w-14 h-14 rounded-2xl bg-slate-950 border border-white/10 flex items-center justify-center text-indigo-500 mb-8 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500 shadow-indigo-500/10">
                  <card.icon className="w-6 h-6" />
                </div>

                <h3 className="text-xl font-bold text-white mb-4 tracking-tight group-hover:text-indigo-400 transition-colors duration-300">
                  {card.title}
                </h3>
                <p className="text-slate-400 text-sm leading-relaxed font-medium">
                  {card.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* CTA */}
        <div className="flex justify-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
          >
            <Link
              href="/contact"
              className="px-10 py-5 bg-indigo-500 hover:bg-indigo-500/90 text-slate-950 text-lg font-black rounded-xl transition-all duration-300 shadow-indigo-500/20 hover:shadow-indigo-500/40 hover:-translate-y-1 flex items-center gap-2"
            >
              Schedule a Free Consultation
              <ArrowRight className="w-5 h-5" />
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
