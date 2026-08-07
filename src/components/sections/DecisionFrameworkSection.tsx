"use client";

import { motion } from "framer-motion";
import { CheckCircle2, AlertTriangle, FileText, Info } from "lucide-react";

export function DecisionFrameworkSection() {
  const selectReasons = [
    {
      title: "Proprietary Intellectual Property",
      desc: "Your product's core value is the technology itself. You need complete ownership of the code, algorithms, and repository assets without vendor dependency.",
    },
    {
      title: "Complex System Integrations",
      desc: "You need to bridge multiple legacy databases, custom external APIs, and local ERP/CRM structures under high security constraints.",
    },
    {
      title: "Advanced AI & Agentic Orchestration",
      desc: "You are building custom LLM logic, vector indexes, and specialized cognitive search pipelines that off-the-shelf tools cannot support.",
    },
    {
      title: "Highly Specific User Experience",
      desc: "Standard SaaS templates or low-code interfaces cannot represent your interactive user flow, custom canvas components, or low-latency interfaces.",
    },
  ];

  const avoidReasons = [
    {
      title: "Standard Off-the-Shelf Use Cases",
      desc: "If your system can be fully powered by standard Shopify, Webflow, or HubSpot setups without custom features, we recommend buying instead of custom building.",
    },
    {
      title: "No Initial Market Validation",
      desc: "If you have not spoken to prospective users or defined your core target MVP features, you should validate the product demand first before investing in engineering.",
    },
    {
      title: "Extremely Tight Launch Window",
      desc: "Custom product engineering requires structural cycles for architecture, database, QA, and security. If you need a site tomorrow, template solutions are better.",
    },
    {
      title: "No Post-Launch Scaling Plan",
      desc: "Custom platforms are dynamic systems requiring active hosting, updates, and maintenance. If there is no plan for post-launch ops, custom builds may stall.",
    },
  ];

  const preparations = [
    {
      title: "Define Core User Flows",
      desc: "Sketch or document exactly how a user lands, signs up, and achieves their main goal. Wireframes or text bullet-points work perfectly.",
    },
    {
      title: "Audit Existing Database/APIs",
      desc: "If integrating with existing systems, list all current schemas, endpoints, and database models to prevent discovery delays.",
    },
    {
      title: "Outline Regulatory/SLA Rules",
      desc: "Identify whether your system must satisfy HIPAA (healthcare), PCI (payments), GDPR (privacy), or strict uptime SLA agreements.",
    },
  ];

  return (
    <section id="decision-framework" className="py-24 px-6 md:px-12 bg-slate-950 relative overflow-hidden">
      {/* Background glow orb */}
      <div className="absolute top-1/2 right-0 w-[500px] h-[500px] bg-indigo-500 opacity-[0.01] blur-[150px] rounded-full pointer-events-none transform -translate-y-1/2" />

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-20">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-indigo-500 text-sm font-bold tracking-widest uppercase mb-6">
            <Info className="w-4 h-4" />
            Decision Framework
          </div>
          <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-6">
            Is Custom Development Right for You?
          </h2>
          <p className="text-slate-400 text-lg font-medium">
            Custom software is an investment in proprietary capability. We believe in helping founders make honest, strategic build decisions.
          </p>
        </div>

        {/* Comparison Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-20">
          {/* Choose Custom */}
          <div className="rounded-3xl border border-white/5 bg-[#1C1B1A] p-8 space-y-6">
            <h3 className="text-xl font-bold text-white flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0" />
              Build Custom Software If...
            </h3>
            <div className="divide-y divide-white/5">
              {selectReasons.map((item, i) => (
                <div key={i} className="py-5 first:pt-0 last:pb-0 space-y-2">
                  <h4 className="text-white font-bold text-base">{item.title}</h4>
                  <p className="text-slate-400 text-sm leading-relaxed font-semibold">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Avoid Custom */}
          <div className="rounded-3xl border border-white/5 bg-[#1C1B1A] p-8 space-y-6">
            <h3 className="text-xl font-bold text-white flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-amber-500 shrink-0" />
              Buy Off-The-Shelf or Wait If...
            </h3>
            <div className="divide-y divide-white/5">
              {avoidReasons.map((item, i) => (
                <div key={i} className="py-5 first:pt-0 last:pb-0 space-y-2">
                  <h4 className="text-white font-bold text-base">{item.title}</h4>
                  <p className="text-slate-400 text-sm leading-relaxed font-semibold">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Preparation Guide */}
        <div className="rounded-3xl border border-white/10 bg-white/5 p-8 sm:p-12">
          <h3 className="text-2xl font-bold text-white mb-8 flex items-center gap-3">
            <FileText className="w-6 h-6 text-[#FFC300]" />
            Pre-Scoping Checklist: What to Prepare First
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {preparations.map((step, i) => (
              <div key={i} className="space-y-3">
                <div className="w-8 h-8 rounded-lg bg-[#FFC300]/10 flex items-center justify-center text-[#FFC300] font-black text-sm">
                  0{i + 1}
                </div>
                <h4 className="text-white font-bold text-lg">{step.title}</h4>
                <p className="text-slate-400 text-sm leading-relaxed font-semibold">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
