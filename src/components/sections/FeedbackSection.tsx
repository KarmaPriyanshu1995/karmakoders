"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, ChevronLeft, ChevronRight, Quote } from "lucide-react";

// TODO: Replace these placeholder testimonials with real, approved client feedback.
// Ensure you obtain client approval before publishing names, logos, or metrics.
const testimonials = [
  {
    name: "Client Partner (Placeholder)",
    role: "VP of Technology",
    company: "US Fintech Enterprise",
    avatar: "CP",
    rating: 5,
    text: "This is a placeholder testimonial representing a custom software development client. Replace with actual verified quote. Example text: 'KarmaKoders transformed our core payment workflows and delivered a secure Next.js portal on-time under Delaware legal guidelines.'",
    result: "Placeholder: +240% Speed",
    highlight: "bg-indigo-500/10 border-indigo-500/30",
  },
  {
    name: "Product Founder (Placeholder)",
    role: "CTO & Co-Founder",
    company: "Healthcare Solutions Start-up",
    avatar: "PF",
    rating: 5,
    text: "This is a placeholder testimonial representing a telemedicine application client. Replace with actual verified quote. Example text: 'Their dedicated project manager synchronized perfectly with our US time-zone schedules, delivering a HIPAA-compliant app.'",
    result: "Placeholder: HIPAA Audited",
    highlight: "bg-purple-500/10 border-purple-500/20",
  },
  {
    name: "Marketing Lead (Placeholder)",
    role: "Head of Digital Experience",
    company: "Enterprise E-Commerce SaaS",
    avatar: "ML",
    rating: 5,
    text: "This is a placeholder testimonial representing a digital brand redesign. Replace with actual verified quote. Example text: 'Beautiful user interfaces and premium micro-interactions helped increase our page conversion rates and brand value.'",
    result: "Placeholder: +45% Conversions",
    highlight: "bg-emerald-500/10 border-emerald-500/20",
  },
];

export function FeedbackSection() {
  const [active, setActive] = useState(0);

  const prev = () => setActive((a) => (a === 0 ? testimonials.length - 1 : a - 1));
  const next = () => setActive((a) => (a === testimonials.length - 1 ? 0 : a + 1));

  const current = testimonials[active];

  return (
    <section id="testimonials" aria-label="Client feedback" className="py-24 px-4 sm:px-6 md:px-12 bg-slate-950 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-indigo-500 opacity-[0.015] blur-[180px] rounded-full pointer-events-none" />

      <div className="max-w-4xl mx-auto relative z-10">
        {/* Header */}
        <div className="text-center mb-16 flex flex-col items-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 backdrop-blur-xl border border-white/10 text-indigo-500 text-sm font-bold tracking-widest uppercase mb-6"
          >
            <Star className="w-4 h-4 fill-indigo-500 text-indigo-500" /> Client Feedback
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-5xl lg:text-6xl font-black text-white tracking-tight leading-tight"
          >
            What Our Clients Say
          </motion.h2>
        </div>

        {/* Carousel slide container */}
        <div className="relative" role="region" aria-roledescription="carousel" aria-label="Testimonial slides">
          <AnimatePresence mode="wait">
            <motion.div
              key={active}
              initial={{ opacity: 0, scale: 0.98, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: -15 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="p-8 sm:p-12 md:p-16 rounded-[2.5rem] bg-white/5 backdrop-blur-2xl border border-white/10 hover:border-indigo-500/30 transition-colors duration-500 relative flex flex-col justify-between"
            >
              {/* Quote Icon background overlay */}
              <Quote className="w-24 h-24 text-indigo-500/10 absolute top-8 right-8 pointer-events-none" />

              <div>
                {/* Rating stars */}
                <div className="flex gap-1.5 mb-8">
                  {[...Array(current.rating)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 text-indigo-500 fill-indigo-500" />
                  ))}
                </div>

                {/* Testimonial text */}
                <p className="text-white text-lg sm:text-xl md:text-2xl leading-relaxed mb-10 italic font-medium">
                  &ldquo;{current.text}&rdquo;
                </p>

                {/* Result metric badge */}
                <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border text-xs font-bold mb-12 ${current.highlight}`}>
                  <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                  <span className="text-indigo-500">Milestone Impact:</span>
                  <span className="text-white">{current.result}</span>
                </div>
              </div>

              {/* Author & controls row */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 border-t border-white/5 pt-8">
                <div className="flex items-center gap-4">
                  {/* Glass placeholder avatar */}
                  <div className="w-14 h-14 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center font-black text-lg text-indigo-500 shadow-indigo-500/5">
                    {current.avatar}
                  </div>
                  <div>
                    <h3 className="text-white font-black text-lg">{current.name}</h3>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mt-0.5">
                      {current.role} &middot; {current.company}
                    </p>
                  </div>
                </div>

                {/* Slide controllers */}
                <div className="flex gap-3 max-sm:w-full max-sm:justify-end">
                  <button
                    onClick={prev}
                    aria-label="Previous testimonial"
                    className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-indigo-500 hover:text-slate-950 hover:border-indigo-500 hover:shadow-indigo-500/20 transition-all duration-300"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={next}
                    aria-label="Next testimonial"
                    className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-indigo-500 hover:text-slate-950 hover:border-indigo-500 hover:shadow-indigo-500/20 transition-all duration-300"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Carousel Indicators dots */}
              <div className="flex justify-center gap-2 mt-8" role="tablist" aria-label="Feedback slide navigation">
                {testimonials.map((_, i) => (
                  <button
                    key={i}
                    role="tab"
                    aria-selected={i === active}
                    aria-label={`Go to slide ${i + 1}`}
                    onClick={() => setActive(i)}
                    className={`h-1.5 rounded-full transition-all duration-300 ${i === active ? "w-8 bg-indigo-500" : "w-3 bg-white/20 hover:bg-white/40"}`}
                  />
                ))}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Global aggregate indicators */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6"
        >
          {[
            { value: "5.0 ★", label: "Average Review Rating" },
            { value: "150+", label: "Successful Projects" },
            { value: "98%", label: "Client Referral Rate" },
            { value: "100%", label: "On-Time Sprint Delivery" },
          ].map((stat) => (
            <div key={stat.label} className="text-center p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-indigo-500/30 transition-colors group">
              <p className="text-3xl font-black text-white group-hover:text-indigo-500 transition-colors mb-2">{stat.value}</p>
              <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">{stat.label}</p>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
