"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Cloud, Lock, ShieldCheck, CreditCard, CheckSquare, Heart, Home, ShoppingBag, Layers, Scale, Globe, Terminal, Cpu } from "lucide-react";

const categories = [
  { id: "tech", label: "Technologies" },
  { id: "industries", label: "Industries" },
  { id: "security", label: "Security & Compliance" },
  { id: "clients", label: "Global Clients" },
];

const trustItems = {
  tech: [
    { name: "Next.js & React", description: "Frontend Excellence", icon: Terminal },
    { name: "Node.js & Python", description: "Scalable Backends", icon: Cpu },
    { name: "AWS & Google Cloud", description: "Secure Cloud Services", icon: Cloud },
    { name: "Stripe & Ethers.js", description: "Payments & Ledger", icon: CreditCard },
    { name: "OpenAI & TensorFlow", description: "AI Integrations", icon: Cpu },
    { name: "Vercel & Docker", description: "Modern DevOps", icon: Layers },
  ],
  industries: [
    { name: "FinTech", description: "Trading & Payment Systems", icon: CreditCard },
    { name: "Healthcare", description: "HIPAA Telemedicine & Diagnostics", icon: Heart },
    { name: "Real Estate", description: "Immersive 3D Walkthroughs", icon: Home },
    { name: "Retail & E-Com", description: "Headless Cart Architectures", icon: ShoppingBag },
    { name: "SaaS Platforms", description: "Multi-tenant Infrastructures", icon: Layers },
    { name: "LegalTech", description: "Secure Document Auditing", icon: Scale },
  ],
  security: [
    { name: "SOC 2 Frameworks", description: "Standard Security Controls", icon: ShieldCheck },
    { name: "HIPAA Compliant", description: "Protected Health Data", icon: Heart },
    { name: "GDPR & CCPA", description: "Strict User Privacy Rules", icon: Lock },
    { name: "PCI-DSS Standards", description: "Secure Billing Protocols", icon: CreditCard },
    { name: "ISO 27001 Ready", description: "Risk Control Protocols", icon: CheckSquare },
    { name: "Zero-Trust Auditing", description: "Continuous Shielding", icon: ShieldCheck },
  ],
  clients: [
    { name: "United States", description: "EST & PST Availability", icon: Globe },
    { name: "Canada", description: "Full Project Syncs", icon: Globe },
    { name: "United Kingdom", description: "Regulatory Alignment", icon: Globe },
    { name: "European Union", description: "GDPR Compliance Overlaps", icon: Globe },
  ],
};

export function PartnersSection() {
  const [activeTab, setActiveTab] = useState<keyof typeof trustItems>("tech");

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
      },
    },
  } as const;

  const itemVariants = {
    hidden: { opacity: 0, scale: 0.95, y: 10 },
    show: { opacity: 1, scale: 1, y: 0, transition: { type: "spring" as const, stiffness: 100 } },
  } as const;

  return (
    <section id="trust-strip" aria-label="Trust indicators" className="py-20 bg-slate-950 relative overflow-hidden border-b border-white/5">
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-slate-950/40 to-slate-950 pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10">
        <div className="text-center mb-12">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 backdrop-blur-xl border border-white/10 text-indigo-500 text-sm font-bold tracking-widest uppercase mb-6"
          >
            Trust & Credentials
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.05 }}
            className="text-3xl md:text-4xl font-black text-white tracking-tight"
          >
            Engineered for Security, Scale, and Compliance
          </motion.h2>
        </div>

        {/* Tab Controls */}
        <div className="flex flex-wrap justify-center gap-2 mb-12 border-b border-white/5 pb-6">
          {categories.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as keyof typeof trustItems)}
              className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
                activeTab === tab.id
                  ? "bg-indigo-500 text-slate-950 shadow-indigo-500/25 shadow-[0_0_15px_var(--color-indigo-500)]"
                  : "bg-white/5 text-slate-400 border border-white/5 hover:text-white hover:bg-white/10"
              }`}
              aria-selected={activeTab === tab.id}
              role="tab"
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Badges Grid */}
        <div className="min-h-[220px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              variants={containerVariants}
              initial="hidden"
              animate="show"
              exit="hidden"
              className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6"
            >
              {trustItems[activeTab].map((item) => (
                <motion.div
                  key={item.name}
                  variants={itemVariants}
                  className="group flex flex-col items-center text-center p-5 rounded-2xl bg-white/5 border border-white/10 hover:border-indigo-500/30 hover:bg-white/10 transition-all duration-300 shadow-[0_4px_20px_rgba(0,0,0,0.2)] cursor-default"
                >
                  <div className="w-12 h-12 rounded-xl bg-slate-950/80 border border-white/5 flex items-center justify-center text-indigo-500 mb-4 group-hover:scale-110 transition-transform duration-300">
                    <item.icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-white font-bold text-sm tracking-tight leading-tight group-hover:text-indigo-400 transition-colors">
                    {item.name}
                  </h3>
                  <p className="text-slate-500 text-xxs mt-1 uppercase tracking-wider font-bold">
                    {item.description}
                  </p>
                </motion.div>
              ))}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
