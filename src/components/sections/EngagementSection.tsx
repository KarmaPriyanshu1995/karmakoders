"use client";

import { motion } from "framer-motion";
import { CheckCircle2, ArrowRight } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const defaultModels = [
  {
    name: "Starter",
    description: "Bespoke MVP and landing page architectures for early-stage startups establishing market validation.",
    idealFor: "Stealth startups and founders looking for quick, high-quality development.",
    projectType: "MVPs, landing pages, simple SaaS products, and branding solutions.",
    timeline: "2 to 4 weeks",
    deliverables: [
      "Custom UI/UX & design prototype",
      "Full-stack Next.js web application",
      "Core AI/database integrations",
      "Standard SEO & setup",
      "1 Month support & maintenance",
    ],
    delay: 0.1,
  },
  {
    name: "Growth",
    description: "Advanced applications and custom SaaS products engineered to scale with your growing business.",
    idealFor: "Established startups, companies scaling operations, and complex web applications.",
    projectType: "Full-scale SaaS platforms, native iOS/Android mobile apps, and custom dashboards.",
    timeline: "1 to 3 months",
    deliverables: [
      "Bespoke interactive 3D assets",
      "Scalable multi-tenant cloud setup",
      "Advanced AI model orchestrations",
      "Comprehensive compliance frameworks",
      "3 Months priority maintenance",
    ],
    popular: true,
    delay: 0.2,
  },
  {
    name: "Enterprise",
    description: "Fully customized software solutions built with strict compliance, security, and dedicated teams.",
    idealFor: "Medium to large companies requiring compliance, security audits, and dedicated support.",
    projectType: "Custom ERPs, compliance-focused medical platforms, financial ledgers, and large systems.",
    timeline: "Long-term partnership",
    deliverables: [
      "Private server & database setup",
      "SOC 2, HIPAA, and GDPR compliance",
      "Dedicated senior engineers & PM",
      "Continuous QA & security audits",
      "12 Months SLAs & support packages",
    ],
    delay: 0.3,
  },
];

interface EngagementProps {
  tagline?: string;
  heading?: string;
  subheading?: string;
  models?: typeof defaultModels;
}

export function EngagementSection({
  tagline = "Engagement Models",
  heading = "Flexible Frameworks for Scaling Teams",
  subheading = "Choose a structured collaboration model designed to fit your project scope, timeline, and compliance needs.",
  models = defaultModels,
}: EngagementProps) {
  const pathname = usePathname();
  const isPricingPage = pathname === "/pricing";
  
  return (
    <section id="engagement" aria-label="Engagement models" className={`${isPricingPage ? "pt-32" : "pt-24"} pb-24 px-4 sm:px-6 md:px-12 bg-slate-950 relative overflow-hidden border-y border-white/5`}>
      {/* Radial lights */}
      <div className="absolute top-0 right-1/4 w-[600px] h-[600px] bg-indigo-500 opacity-[0.01] blur-[150px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-[500px] h-[500px] bg-indigo-500 opacity-[0.01] blur-[130px] rounded-full pointer-events-none" />

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
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="mt-6 text-[#D6D6D6] text-xl font-medium"
          >
            {subheading}
          </motion.p>
        </div>

        {/* Models Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {models.map((model, i) => (
            <motion.div
              key={model.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: model.delay, duration: 0.6, ease: "easeOut" }}
              className={`relative rounded-[2.5rem] bg-white/5 border p-8 flex flex-col justify-between transition-all duration-500 hover:-translate-y-2 ${
                model.popular
                  ? "border-indigo-500 shadow-indigo-500/10 shadow-[0_15px_40px_rgba(0,0,0,0.5)] md:scale-105 z-10 bg-white/10"
                  : "border-white/10 hover:border-white/20 hover:bg-white/10"
              }`}
            >
              {model.popular && (
                <div className="absolute top-0 right-10 -translate-y-1/2 px-4 py-1 rounded-full bg-indigo-500 text-slate-950 font-black text-xs uppercase tracking-wider shadow-[0_0_15px_var(--color-indigo-500)]">
                  Most Popular
                </div>
              )}

              <div>
                <h3 className="text-3xl font-black text-white mb-2">{model.name}</h3>
                <p className="text-slate-400 text-sm leading-relaxed mb-6 font-medium">{model.description}</p>

                {/* Price tag as Custom Proposal */}
                <div className="py-4 border-y border-white/5 mb-6 flex flex-col gap-1">
                  <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Pricing Structure</span>
                  <span className="text-3xl font-black text-white">Custom Proposal</span>
                </div>

                {/* Meta details */}
                <div className="space-y-4 mb-6">
                  <div>
                    <h4 className="text-xs text-slate-500 font-bold uppercase tracking-widest mb-1">Ideal For</h4>
                    <p className="text-[#D6D6D6] text-sm font-semibold leading-relaxed">{model.idealFor}</p>
                  </div>
                  <div>
                    <h4 className="text-xs text-slate-500 font-bold uppercase tracking-widest mb-1">Project Type</h4>
                    <p className="text-[#D6D6D6] text-sm font-semibold leading-relaxed">{model.projectType}</p>
                  </div>
                  <div>
                    <h4 className="text-xs text-slate-500 font-bold uppercase tracking-widest mb-1">Typical Timeline</h4>
                    <p className="text-[#D6D6D6] text-sm font-semibold leading-relaxed">{model.timeline}</p>
                  </div>
                </div>

                {/* Deliverables List */}
                <div className="mb-8">
                  <h4 className="text-xs text-slate-500 font-bold uppercase tracking-widest mb-4">Core Deliverables</h4>
                  <ul className="space-y-3" role="list">
                    {model.deliverables.map((item) => (
                      <li key={item} className="flex items-start gap-3">
                        <CheckCircle2 className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
                        <span className="text-[#D6D6D6] text-sm font-medium leading-relaxed">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <Link
                href="/contact"
                className={`w-full py-4 rounded-xl text-center font-bold text-sm transition-all duration-300 flex items-center justify-center gap-2 hover:-translate-y-0.5 active:scale-95 ${
                  model.popular
                    ? "bg-indigo-500 text-slate-950 hover:bg-indigo-500/90 shadow-indigo-500/20"
                    : "bg-white/5 border border-white/10 text-white hover:bg-white/10 hover:border-indigo-500/30"
                }`}
              >
                Request Pricing
                <ArrowRight className="w-4 h-4" />
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
