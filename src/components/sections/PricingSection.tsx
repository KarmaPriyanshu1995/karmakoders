"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { PricingExtras } from "@/components/sections/PricingExtras";
import { TestimonialsSection } from "@/components/sections/TestimonialsSection";
import { useSiteContent } from "@/components/SiteContentProvider";

interface PricingProps {
  tagline?: string;
  heading?: string;
  isFirstSection?: boolean;
}

export function PricingSection({
  tagline = "Pricing Architecture",
  heading = "Invest in Your Digital Dominance",
  isFirstSection = false,
}: PricingProps) {
  const { pricing } = useSiteContent();
  return (
    <>
    <section id="pricing" aria-label="Pricing plans" className="pt-28 sm:pt-32 pb-16 px-4 sm:px-6 md:px-12 bg-[#252422] relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#FFC300] opacity-[0.03] blur-[120px] -mr-64 -mt-64 rounded-full pointer-events-none" />
      <div className="max-w-7xl mx-auto relative z-10">
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 backdrop-blur-xl border border-white/10 text-[#FFC300] text-sm font-bold tracking-widest uppercase mb-6"
          >
            {tagline}
          </motion.div>
          {isFirstSection ? (
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mt-4 text-5xl md:text-6xl font-black text-white max-w-3xl mx-auto tracking-tight"
            >
              {heading}
            </motion.h1>
          ) : (
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mt-4 text-5xl md:text-6xl font-black text-white max-w-3xl mx-auto tracking-tight"
            >
              {heading}
            </motion.h2>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
          {pricing.tiers.map((plan, i) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.6 }}
              className={cn("relative rounded-[2rem]", plan.popular ? "lg:-mt-4" : "")}
            >
              <div
                className={cn(
                  "relative p-10 rounded-[2rem] flex flex-col h-full border",
                  plan.popular
                    ? "bg-[#1C1B1A]/90 border-[#FFC300]/50 shadow-[0_0_40px_rgba(255,195,0,0.15)]"
                    : "bg-white/5 border-white/10",
                )}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-[#FFC300] text-[#1C1B1A] text-xs font-bold rounded-full uppercase tracking-widest">
                    Recommended
                  </div>
                )}
                <h4 className="text-2xl font-bold text-white mb-3">{plan.name}</h4>
                <p className="text-4xl font-black text-white">{plan.from}</p>
                <p className="text-indigo-300 text-sm font-semibold mt-2">{plan.typical}</p>
                <p className="text-[#D6D6D6] text-sm leading-relaxed mt-4 mb-8">{plan.description}</p>
                <div className="space-y-4 mb-10 flex-1">
                  {plan.features.map((feature) => (
                    <div key={feature} className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-[#FFC300]/10 flex items-center justify-center text-[#FFC300] shrink-0 mt-0.5">
                        <Check className="w-3.5 h-3.5" strokeWidth={3} />
                      </div>
                      <span className="text-slate-200 text-sm font-medium leading-relaxed">{feature}</span>
                    </div>
                  ))}
                </div>
                <Link
                  href="/contact?type=estimate"
                  className={cn(
                    "w-full h-14 rounded-xl text-base font-bold flex items-center justify-center",
                    plan.popular ? "bg-[#FFC300] text-[#1C1B1A]" : "border border-white/20 text-white",
                  )}
                >
                  {plan.from === "Custom" ? "Contact Us" : "Request this tier"}
                </Link>
              </div>
            </motion.div>
          ))}
        </div>

        <PricingExtras />
      </div>
    </section>
    <TestimonialsSection tagline="Social proof" heading="What teams say after we ship" />
    </>
  );
}
