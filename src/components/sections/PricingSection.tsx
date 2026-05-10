"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";

const defaultPlans = [
  {
    name: "Starter",
    price: "$99",
    description: "Perfect for small businesses looking to establish a digital presence.",
    features: ["1 Landing Page", "Basic 3D Components", "Standard SEO", "Email Support", "1 Month Maintenance"],
    isPopular: false,
  },
  {
    name: "Professional",
    price: "$299",
    description: "The ideal solution for growing companies needing advanced features.",
    features: ["Up to 5 Pages", "Advanced 3D Animations", "Full AI Integration", "24/7 Priority Support", "3 Months Maintenance", "Dynamic CMS Access"],
    isPopular: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    description: "Fully bespoke solutions for large-scale enterprise requirements.",
    features: ["Unlimited Pages", "Custom 3D Environments", "Private AI Model Training", "Dedicated Project Manager", "12 Months Maintenance", "Multi-language Support"],
    isPopular: false,
  },
];

interface PricingProps {
  tagline?: string;
  heading?: string;
  plans?: typeof defaultPlans;
}

export function PricingSection({
  tagline = "Pricing Plans",
  heading = "Invest in Your Future Digital Success",
  plans = defaultPlans,
}: PricingProps) {
  return (
    <section id="pricing" className="py-32 px-8 md:px-24 bg-slate-950 relative overflow-hidden">
      {/* Bg glow */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-600/5 blur-[120px] -mr-64 -mt-64" />
      
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
            className="mt-4 text-4xl md:text-5xl font-bold text-white max-w-2xl mx-auto"
          >
            {heading}
          </motion.h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className={`p-10 rounded-[32px] border ${plan.isPopular ? 'border-indigo-500 bg-indigo-500/5 relative' : 'border-slate-800 bg-slate-900/40'} flex flex-col`}
            >
              {plan.isPopular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-indigo-600 text-white text-xs font-bold rounded-full uppercase tracking-widest">
                  Most Popular
                </div>
              )}
              
              <div className="mb-8">
                <h4 className="text-xl font-bold text-white mb-2">{plan.name}</h4>
                <div className="flex items-baseline gap-1 mb-4">
                  <span className="text-5xl font-bold text-white">{plan.price}</span>
                  {plan.price !== "Custom" && <span className="text-slate-500">/project</span>}
                </div>
                <p className="text-slate-400 text-sm">{plan.description}</p>
              </div>
              
              <div className="space-y-4 mb-10 flex-1">
                {plan.features.map((feature) => (
                  <div key={feature} className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400 shrink-0">
                      <Check className="w-3 h-3" />
                    </div>
                    <span className="text-slate-300 text-sm">{feature}</span>
                  </div>
                ))}
              </div>
              
              <Button
                variant={plan.isPopular ? "default" : "outline"}
                className={`w-full h-12 rounded-full font-bold transition-all ${plan.isPopular ? 'bg-indigo-600 hover:bg-indigo-500' : 'border-slate-700 hover:bg-white/5'}`}
              >
                Choose Plan
              </Button>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
