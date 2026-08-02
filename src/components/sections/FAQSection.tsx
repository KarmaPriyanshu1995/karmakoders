"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

// Enterprise-focused FAQ content addressing US market buyer objections
const defaultFaqs = [
  {
    question: "How do you coordinate with USA and Canada time zones?",
    answer: "We ensure full daily overlap during your active working hours. Our dedicated Project Managers and lead engineers host daily stand-ups and sprint reviews during EST/PST times. All communication is maintained on Slack, Teams, or Jira for instant accessibility.",
  },
  {
    question: "Do you sign NDAs before discussing project scope?",
    answer: "Absolutely. We require mutual or unilateral NDAs before any technical scoping, code audits, or system design discussions take place. Your brand security and IP are protected from day one.",
  },
  {
    question: "How is intellectual property and code ownership handled?",
    answer: "Once a milestone is delivered and signed off, 100% of the intellectual property, repository access, and code assets are legally transferred to your company under Delaware law.",
  },
  {
    question: "What compliance standards and security controls do you follow?",
    answer: "We develop all projects using compliance-first engineering. We build to satisfy SOC 2 Type II controls, HIPAA standards for healthcare systems, GDPR & CCPA for global user privacy, and PCI-DSS rules for custom checkouts.",
  },
  {
    question: "What is your typical project velocity and sprint schedule?",
    answer: "We operate on bi-weekly agile sprints. At the end of every 2 weeks, we host a sprint review showcasing functioning software on staging environments. This ensures continuous feedback and rapid iteration with zero surprises.",
  },
  {
    question: "How does billing work and do you support USD payments?",
    answer: "All contracts are executed in USD and processed via secure invoicing. We offer flexible options, including fixed-price scopes for validated MVPs and dedicated monthly engineer retainers for growing SaaS platforms.",
  },
];

interface FaqProps {
  isSpace?: boolean;
  tagline?: string;
  heading?: string;
  faqs?: typeof defaultFaqs;
}

export function FAQSection({
  isSpace = false,
  tagline = "FAQ",
  heading = "Frequently Asked Questions",
  faqs = defaultFaqs,
}: FaqProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" aria-label="Frequently asked questions" className={cn(
      "px-4 sm:px-6 md:px-12 bg-slate-950 relative overflow-hidden",
      isSpace ? "py-24" : "pb-24"
    )}>
      {/* Background glowing orb */}
      <div className="absolute top-1/2 right-0 w-[600px] h-[400px] bg-indigo-500 opacity-[0.015] blur-[150px] rounded-full pointer-events-none transform -translate-y-1/2 translate-x-1/4" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-indigo-500 opacity-[0.01] blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-4xl mx-auto relative z-10">
        <div className="text-center mb-16 flex flex-col items-center">
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
            className="text-4xl md:text-5xl font-black text-white tracking-tight text-center leading-tight"
          >
            {heading}
          </motion.h2>
        </div>

        <div className="space-y-4" role="list">
          {faqs.map((faq, i) => {
            const isExpanded = openIndex === i;
            const panelId = `faq-panel-${i}`;
            const headingId = `faq-heading-${i}`;
            return (
              <motion.div
                key={faq.question}
                role="listitem"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="rounded-3xl border border-white/10 bg-white/5 hover:border-indigo-500/30 transition-all duration-500 overflow-hidden"
              >
                <h3>
                  <button
                    id={headingId}
                    aria-expanded={isExpanded}
                    aria-controls={panelId}
                    onClick={() => setOpenIndex(isExpanded ? null : i)}
                    className="w-full p-6 text-left flex items-center justify-between hover:bg-white/5 transition-colors focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 outline-none group cursor-pointer"
                  >
                    <span className="text-lg font-bold text-white group-hover:text-indigo-400 transition-colors duration-300 pr-4">{faq.question}</span>
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 shrink-0",
                      isExpanded ? "bg-indigo-500 text-slate-950 shadow-indigo-500/30 shadow-[0_0_15px_var(--color-indigo-500)]" : "bg-white/5 text-white border border-white/10"
                    )}
                      aria-hidden="true"
                    >
                      <ChevronDown className={cn("w-5 h-5 transition-transform duration-300", isExpanded ? "rotate-180" : "")} />
                    </div>
                  </button>
                </h3>

                <div
                  id={panelId}
                  role="region"
                  aria-labelledby={headingId}
                  aria-hidden={!isExpanded}
                  style={{
                    display: "grid",
                    gridTemplateRows: isExpanded ? "1fr" : "0fr",
                    opacity: isExpanded ? 1 : 0,
                    transition: "grid-template-rows 0.3s ease, opacity 0.3s ease",
                  }}
                >
                  <div className="overflow-hidden">
                    <div className="p-6 text-slate-400 leading-relaxed border-t border-white/5 font-semibold text-sm sm:text-base">
                      {faq.answer}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
