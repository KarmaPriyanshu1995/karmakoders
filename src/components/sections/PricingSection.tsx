"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const defaultPlans = [
  {
    name: "Starter",
    monthlyPrice: "$99",
    yearlyPrice: "$950",
    description: "Perfect for stealth startups looking to establish a premium digital footprint.",
    features: ["1 Landing Page", "Basic Animations", "Standard SEO", "Email Support", "1 Month Maintenance"],
    isPopular: false,
  },
  {
    name: "Professional",
    monthlyPrice: "$299",
    yearlyPrice: "$2,850",
    description: "The ideal solution for growing tech agencies needing advanced features and AI.",
    features: ["Up to 5 Pages", "Advanced 3D Effects", "Full AI Agent Integration", "24/7 Priority Support", "3 Months Maintenance", "Dynamic CMS Access"],
    isPopular: true,
  },
  {
    name: "Enterprise",
    monthlyPrice: "Custom",
    yearlyPrice: "Custom",
    description: "Fully bespoke SaaS architectures for large-scale enterprise requirements.",
    features: ["Unlimited Pages", "Custom 3D Environments", "Private AI Model Training", "Dedicated Engineering Team", "12 Months Maintenance", "Multi-region Support"],
    isPopular: false,
  },
];

interface PricingProps {
  tagline?: string;
  heading?: string;
  plans?: typeof defaultPlans;
}

export function PricingSection({
  tagline = "Pricing Architecture",
  heading = "Invest in Your Digital Dominance",
  plans = defaultPlans,
}: PricingProps) {
  const [isYearly, setIsYearly] = useState(false);

  return (
    <section id="pricing" aria-label="Pricing plans" className="pt-28 sm:pt-32 pb-16 px-4 sm:px-6 md:px-12 bg-[#252422] relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#FFC300] opacity-[0.03] blur-[120px] -mr-64 -mt-64 rounded-full pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-[#FFC300] opacity-[0.02] blur-[150px] -ml-64 -mb-64 rounded-full pointer-events-none" />
      
      <div className="max-w-7xl mx-auto relative z-10">
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 backdrop-blur-xl border border-white/10 text-[#FFC300] text-sm font-bold tracking-widest uppercase shadow-[0_0_15px_rgba(255,195,0,0.1)] mb-6"
          >
            {tagline}
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="mt-4 text-5xl md:text-6xl font-black text-white max-w-2xl mx-auto tracking-tight"
          >
            {heading}
          </motion.h2>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="mt-12 flex items-center justify-center gap-4"
          >
            <span id="billing-monthly" className={cn("text-lg font-bold transition-colors", !isYearly ? "text-white" : "text-[#D6D6D6]")}>Monthly</span>
            <button 
              onClick={() => setIsYearly(!isYearly)}
              role="switch"
              aria-checked={isYearly}
              aria-label="Toggle between monthly and yearly billing"
              className="relative w-16 h-8 rounded-full bg-white/10 border border-white/20 p-1 transition-colors hover:border-[#FFC300]/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FFC300]"
            >
              <motion.div 
                className="w-6 h-6 rounded-full bg-[#FFC300] shadow-[0_0_10px_rgba(255,195,0,0.5)]"
                animate={{ x: isYearly ? 32 : 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                aria-hidden="true"
              />
            </button>
            <span id="billing-yearly" className={cn("text-lg font-bold transition-colors flex items-center gap-2", isYearly ? "text-white" : "text-[#D6D6D6]")}>
              Yearly <span className="text-xs px-2 py-1 bg-[#FFC300]/20 text-[#FFC300] rounded-full uppercase tracking-wider font-bold">Save 20%</span>
            </span>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.6 }}
              className={cn(
                "relative group rounded-[2rem]",
                plan.isPopular ? "lg:-mt-8 lg:mb-8" : ""
              )}
            >
              {/* Animated Glowing Border for Popular Plan */}
              {plan.isPopular && (
                <div className="absolute -inset-[2px] rounded-[2.1rem] bg-gradient-to-b from-[#FFC300] via-[#FFC300]/20 to-transparent opacity-50 group-hover:opacity-100 transition-opacity duration-500 blur-[2px]" />
              )}
              
              <div className={cn(
                "relative p-10 rounded-[2rem] flex flex-col h-full transition-all duration-500 backdrop-blur-xl border",
                plan.isPopular ? "bg-[#1C1B1A]/90 border-[#FFC300]/50 shadow-[0_0_40px_rgba(255,195,0,0.15)]" : "bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/10"
              )}>
                {plan.isPopular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-[#FFC300] text-[#1C1B1A] text-xs font-bold rounded-full uppercase tracking-widest shadow-[0_0_15px_rgba(255,195,0,0.4)]">
                    Recommended
                  </div>
                )}
                
                <div className="mb-8">
                  <h4 className="text-2xl font-bold text-white mb-4">{plan.name}</h4>
                  <div className="flex items-baseline gap-1 mb-4 h-16">
                    <AnimatePresence mode="wait">
                      <motion.span 
                        key={isYearly ? 'yearly' : 'monthly'}
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        transition={{ duration: 0.2 }}
                        className="text-5xl font-black text-white"
                      >
                        {isYearly ? plan.yearlyPrice : plan.monthlyPrice}
                      </motion.span>
                    </AnimatePresence>
                    {plan.monthlyPrice !== "Custom" && (
                      <span className="text-[#D6D6D6] font-medium">/{isYearly ? 'year' : 'month'}</span>
                    )}
                  </div>
                  <p className="text-[#D6D6D6] text-sm leading-relaxed">{plan.description}</p>
                </div>
                
                <div className="space-y-5 mb-10 flex-1">
                  {plan.features.map((feature) => (
                    <div key={feature} className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-[#FFC300]/10 flex items-center justify-center text-[#FFC300] shrink-0 mt-0.5">
                        <Check className="w-3.5 h-3.5" strokeWidth={3} />
                      </div>
                      <span className="text-slate-200 text-sm font-medium leading-relaxed">{feature}</span>
                    </div>
                  ))}
                </div>
                
                <Button
                  variant={plan.isPopular ? "default" : "outline"}
                  className={cn(
                    "w-full h-14 rounded-xl text-base font-bold transition-all duration-300",
                    plan.isPopular ? "bg-[#FFC300] text-[#1C1B1A] hover:shadow-[0_0_25px_rgba(255,195,0,0.4)]" : "border-white/20 text-white hover:bg-white/10 hover:border-white/30"
                  )}
                >
                  {plan.monthlyPrice === "Custom" ? "Contact Us" : "Choose Plan"}
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
