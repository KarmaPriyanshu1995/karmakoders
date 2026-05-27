"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const defaultFaqs = [
  {
    question: "How long does a typical project take?",
    answer: "Project timelines vary depending on complexity. A standard landing page takes about 2-3 weeks, while complex platforms can take 2-4 months. We'll provide a detailed schedule during our kick-off meeting.",
  },
  {
    question: "What industries do you specialize in?",
    answer: "We have experience across fintech, healthcare, e-commerce, real estate, and entertainment. However, our AI-driven approach allows us to adapt to almost any industry looking for premium digital experiences.",
  },
  {
    question: "Do you offer post-launch support?",
    answer: "Yes, we provide tiered maintenance and support packages to ensure your platform remains secure, up-to-date, and continues to perform optimally after launch.",
  },
  {
    question: "Can you work with our existing brand guidelines?",
    answer: "Absolutely. We can either build upon your existing brand identity or help you evolve it into a more modern, digital-first aesthetic while maintaining core brand values.",
  },
  {
    question: "How does your AI redesign system work?",
    answer: "Our proprietary AI engine analyzes design trends and user inspiration images to generate dynamic theme tokens. This allows for rapid prototyping and highly personalized design systems.",
  },
];

interface FaqProps {
  tagline?: string;
  heading?: string;
  faqs?: typeof defaultFaqs;
}

export function FAQSection({
  tagline = "FAQ",
  heading = "Common Questions",
  faqs = defaultFaqs,
}: FaqProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="py-32 px-8 md:px-24 bg-slate-950 relative overflow-hidden">
      {/* Background glowing orb */}
      <div className="absolute top-1/2 right-0 w-[600px] h-[600px] bg-indigo-500 opacity-[0.02] blur-[150px] rounded-full pointer-events-none transform -translate-y-1/2 translate-x-1/4" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-indigo-500 opacity-[0.01] blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-4xl mx-auto relative z-10">
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

        <div className="space-y-4">
          {faqs.map((faq, i) => (
            <motion.div
              key={faq.question}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="rounded-[2rem] border border-white/10 bg-white/5 hover:border-indigo-500/30 transition-all duration-500 overflow-hidden"
            >
              <button
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="w-full p-6 text-left flex items-center justify-between hover:bg-white/5 transition-colors outline-none group"
              >
                <span className="text-lg font-bold text-white group-hover:text-indigo-400 transition-colors duration-300 pr-4">{faq.question}</span>
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 shrink-0",
                  openIndex === i ? "bg-indigo-500 text-slate-950 shadow-indigo-500/30 shadow-[0_0_15px_var(--color-indigo-500)]" : "bg-white/5 text-white border border-white/10"
                )}>
                  <ChevronDown className={cn("w-5 h-5 transition-transform duration-300", openIndex === i ? "rotate-180" : "")} />
                </div>
              </button>
              
              <AnimatePresence>
                {openIndex === i && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="p-6 pt-0 text-[#D6D6D6] leading-relaxed border-t border-white/10 font-medium">
                      {faq.answer}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
