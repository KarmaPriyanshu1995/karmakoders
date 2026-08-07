"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Sliders, Calendar, Database, Sparkles, ArrowRight } from "lucide-react";
import Link from "next/link";

export function ProjectEstimatorSection() {
  const [projectStage, setProjectStage] = useState("idea"); // idea, wireframes, code
  const [platformType, setPlatformType] = useState("saas"); // saas, mobile, web, ai
  const [features, setFeatures] = useState({
    auth: true,
    payments: false,
    aiAgent: false,
    multiRegion: false,
    analytics: true,
  });

  const [calculation, setCalculation] = useState({
    timeline: "4-6 weeks",
    complexity: "Medium",
    stack: "Next.js + TailwindCSS + Node.js + PostgreSQL",
    complexityScore: 60,
  });

  const toggleFeature = (key: keyof typeof features) => {
    setFeatures((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  useEffect(() => {
    let baseWeeks = 4;
    let complexityVal = 30;

    // Stage modifier
    if (projectStage === "idea") {
      baseWeeks += 2;
      complexityVal += 15;
    } else if (projectStage === "code") {
      baseWeeks -= 1;
      complexityVal -= 10;
    }

    // Platform type
    if (platformType === "saas") {
      baseWeeks += 3;
      complexityVal += 20;
    } else if (platformType === "mobile") {
      baseWeeks += 4;
      complexityVal += 25;
    } else if (platformType === "ai") {
      baseWeeks += 5;
      complexityVal += 35;
    }

    // Features
    if (features.auth) {
      baseWeeks += 0.5;
      complexityVal += 5;
    }
    if (features.payments) {
      baseWeeks += 1.5;
      complexityVal += 10;
    }
    if (features.aiAgent) {
      baseWeeks += 3;
      complexityVal += 25;
    }
    if (features.multiRegion) {
      baseWeeks += 2.5;
      complexityVal += 20;
    }
    if (features.analytics) {
      baseWeeks += 0.5;
      complexityVal += 5;
    }

    // Determine complexity level
    let complexityLabel = "Low";
    if (complexityVal >= 85) {
      complexityLabel = "Enterprise Architecture";
    } else if (complexityVal >= 60) {
      complexityLabel = "High Complexity";
    } else if (complexityVal >= 40) {
      complexityLabel = "Medium Complexity";
    }

    // Recommend stack
    let recommendedStack = "Next.js + Node.js + PostgreSQL + AWS";
    if (platformType === "mobile") {
      recommendedStack = "React Native + Node.js + PostgreSQL + Supabase";
    } else if (platformType === "ai" || features.aiAgent) {
      recommendedStack = "Next.js + FastAPI + Python (LangChain) + PostgreSQL + pgvector";
    } else if (platformType === "web" && !features.payments) {
      recommendedStack = "Next.js + TailwindCSS + Sanity CMS + Vercel";
    }

    // Min timeline bounds
    const minWeeks = Math.max(2, Math.floor(baseWeeks));
    const maxWeeks = Math.floor(baseWeeks + 2);

    setCalculation({
      timeline: `${minWeeks}-${maxWeeks} weeks`,
      complexity: complexityLabel,
      stack: recommendedStack,
      complexityScore: Math.min(100, Math.max(10, complexityVal)),
    });
  }, [projectStage, platformType, features]);

  const getMessageUrl = () => {
    const summary = `Estimator Configuration:
- Platform: ${platformType.toUpperCase()}
- Stage: ${projectStage.charAt(0).toUpperCase() + projectStage.slice(1)}
- Enabled Modules: ${Object.entries(features)
      .filter(([_, enabled]) => enabled)
      .map(([name]) => name)
      .join(", ")}
- Estimated Complexity: ${calculation.complexity} (${calculation.complexityScore}%)
- Estimated Timeline: ${calculation.timeline}`;
    return `/contact?type=estimate&service=custom-scope&message=${encodeURIComponent(summary)}`;
  };

  return (
    <section id="estimator" className="py-24 px-6 md:px-12 bg-[#1C1B1A] border-y border-white/5 relative overflow-hidden">
      {/* Glow Effects */}
      <div className="absolute top-1/2 left-0 w-[500px] h-[500px] bg-[#FFC300] opacity-[0.02] blur-[150px] rounded-full pointer-events-none transform -translate-y-1/2 -translate-x-1/2" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-[#FFC300] opacity-[0.02] blur-[150px] rounded-full pointer-events-none transform translate-y-1/4 translate-x-1/4" />

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-[#FFC300] text-sm font-bold tracking-widest uppercase mb-6">
            <Sliders className="w-4 h-4" />
            Build Readiness Estimator
          </div>
          <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-6">
            Map & Size Your Roadmap in 30 Seconds
          </h2>
          <p className="text-[#A39F97] text-lg font-medium">
            Configure your technical requirements to generate a project scope overview, estimated delivery timeline, and recommended system architecture.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Controls - 7 columns */}
          <div className="lg:col-span-7 space-y-8 rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl">
            {/* Step 1: Project Stage */}
            <div>
              <label className="text-white font-bold text-sm uppercase tracking-widest block mb-4">
                1. Project Stage
              </label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: "idea", label: "Idea / Concept" },
                  { id: "wireframes", label: "UX / Wireframes" },
                  { id: "code", label: "Existing Code" },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setProjectStage(item.id)}
                    className={`h-12 rounded-xl text-sm font-bold border transition-all cursor-pointer ${
                      projectStage === item.id
                        ? "bg-[#FFC300] border-[#FFC300] text-[#1C1B1A] shadow-[0_0_15px_rgba(255,195,0,0.3)]"
                        : "bg-[#252422]/60 border-white/10 text-white hover:bg-[#252422] hover:border-white/20"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Step 2: Platform Type */}
            <div>
              <label className="text-white font-bold text-sm uppercase tracking-widest block mb-4">
                2. Platform / Build Target
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { id: "saas", label: "SaaS Product" },
                  { id: "mobile", label: "Mobile App" },
                  { id: "web", label: "Corporate Web" },
                  { id: "ai", label: "AI Integration" },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setPlatformType(item.id)}
                    className={`h-12 rounded-xl text-sm font-bold border transition-all cursor-pointer ${
                      platformType === item.id
                        ? "bg-[#FFC300] border-[#FFC300] text-[#1C1B1A] shadow-[0_0_15px_rgba(255,195,0,0.3)]"
                        : "bg-[#252422]/60 border-white/10 text-white hover:bg-[#252422] hover:border-white/20"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Step 3: Required Features */}
            <div>
              <label className="text-white font-bold text-sm uppercase tracking-widest block mb-4">
                3. Integrations & Requirements
              </label>
              <div className="space-y-3">
                {[
                  { id: "auth", label: "User Authentication & RBAC Rules" },
                  { id: "payments", label: "Subscription Billing & Stripe Payment Gateways" },
                  { id: "aiAgent", label: "Custom AI LLM Agents & RAG Vector Search" },
                  { id: "multiRegion", label: "High-Availability Multi-Region Infrastructure" },
                  { id: "analytics", label: "Automated Tracking & Usage Metrics Dashboard" },
                ].map((item) => {
                  const key = item.id as keyof typeof features;
                  const isEnabled = features[key];
                  return (
                    <button
                      key={item.id}
                      onClick={() => toggleFeature(key)}
                      className={`w-full h-14 rounded-xl px-5 text-left border flex items-center justify-between transition-all cursor-pointer ${
                        isEnabled
                          ? "bg-white/10 border-[#FFC300]/30 text-white"
                          : "bg-[#252422]/40 border-white/5 text-[#A39F97] hover:bg-[#252422]/60"
                      }`}
                    >
                      <span className="font-semibold text-sm sm:text-base">{item.label}</span>
                      <div
                        className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${
                          isEnabled
                            ? "bg-[#FFC300] border-[#FFC300] text-[#1C1B1A]"
                            : "border-white/30"
                        }`}
                      >
                        {isEnabled && "✓"}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Outputs - 5 columns */}
          <div className="lg:col-span-5 rounded-3xl border border-white/10 bg-[#252422] p-8 flex flex-col justify-between shadow-2xl relative overflow-hidden group">
            {/* Top Border Glow Effect */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#FFC300] to-transparent opacity-80" />

            <div className="space-y-8">
              <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#FFC300]" />
                Estimate Output
              </h3>

              {/* Complexity Score */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm font-bold text-[#A39F97] uppercase tracking-widest">
                  <span>Architecture Complexity</span>
                  <span className="text-white">{calculation.complexity}</span>
                </div>
                <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#FFC300] transition-all duration-500 rounded-full"
                    style={{ width: `${calculation.complexityScore}%` }}
                  />
                </div>
              </div>

              {/* Timeline Output */}
              <div className="flex gap-4 items-start p-4 rounded-2xl bg-white/5 border border-white/5">
                <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-[#FFC300] shrink-0">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-white text-sm font-bold uppercase tracking-widest mb-1">
                    Timeline Estimate
                  </h4>
                  <p className="text-2xl font-black text-white">{calculation.timeline}</p>
                  <p className="text-[#A39F97] text-xs font-semibold mt-1">
                    Estimated using agile bi-weekly deliverables
                  </p>
                </div>
              </div>

              {/* Stack Output */}
              <div className="flex gap-4 items-start p-4 rounded-2xl bg-white/5 border border-white/5">
                <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-[#FFC300] shrink-0">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-white text-sm font-bold uppercase tracking-widest mb-1">
                    Recommended Tech Stack
                  </h4>
                  <p className="text-sm font-bold text-white leading-relaxed">{calculation.stack}</p>
                </div>
              </div>
            </div>

            <div className="mt-12 space-y-4">
              <Link
                href={getMessageUrl()}
                className="w-full h-14 bg-[#FFC300] hover:bg-[#FFC300]/90 text-[#1C1B1A] font-black text-sm uppercase tracking-widest rounded-xl flex items-center justify-center gap-2 transition-all hover:scale-[1.02] shadow-[0_4px_20px_rgba(255,195,0,0.15)] cursor-pointer"
              >
                Discuss Scope & Estimates
                <ArrowRight className="w-4 h-4" />
              </Link>
              <p className="text-[#A39F97] text-center text-xs font-semibold">
                Estimations are tentative based on typical scope benchmarks
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
