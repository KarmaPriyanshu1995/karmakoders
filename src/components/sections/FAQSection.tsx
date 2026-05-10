"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { ChevronDown } from "lucide-react";

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
    <section id="faq" className="py-32 px-8 md:px-24 bg-slate-950">
      <div className="max-w-4xl mx-auto">
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

        <div className="space-y-4">
          {faqs.map((faq, i) => (
            <motion.div
              key={faq.question}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="rounded-3xl border border-slate-800 bg-slate-900/40 overflow-hidden"
            >
              <button
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="w-full p-6 text-left flex items-center justify-between hover:bg-white/5 transition-colors"
              >
                <span className="text-lg font-bold text-white">{faq.question}</span>
                <ChevronDown className={`w-5 h-5 text-indigo-500 transition-transform duration-300 ${openIndex === i ? 'rotate-180' : ''}`} />
              </button>
              
              <AnimatePresence>
                {openIndex === i && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="p-6 pt-0 text-slate-400 leading-relaxed border-t border-slate-800/50">
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
