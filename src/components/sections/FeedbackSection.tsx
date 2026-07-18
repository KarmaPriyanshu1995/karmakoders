"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, ChevronLeft, ChevronRight, Quote } from "lucide-react";

const testimonials = [
  {
    name: "Aryan Kapoor",
    role: "CEO",
    company: "TechVenture India",
    avatar: "AK",
    rating: 5,
    text: "karmakoders transformed our entire digital presence. The 3D animations and AI integrations they built were beyond anything we imagined. Our conversion rates tripled in the first month.",
    result: "3x Conversion Rate",
    highlight: "bg-indigo-500/10 border-indigo-500/30",
  },
  {
    name: "Sarah Mitchell",
    role: "Product Director",
    company: "Finova Labs",
    avatar: "SM",
    rating: 5,
    text: "Working with karmakoders was a game-changer. Their attention to design details, performance optimization, and seamless delivery made this the smoothest project I've managed in 10 years.",
    result: "Launched in 3 Weeks",
    highlight: "bg-purple-500/10 border-purple-500/20",
  },
  {
    name: "Rohan Sharma",
    role: "Founder",
    company: "EduTech Startup",
    avatar: "RS",
    rating: 5,
    text: "The team at karmakoders doesn't just build websites — they engineer experiences. Our platform serves 50,000+ students today, and it runs flawlessly. Truly world-class execution.",
    result: "50K+ Active Users",
    highlight: "bg-emerald-500/10 border-emerald-500/20",
  },
  {
    name: "Priya Mehta",
    role: "Marketing Head",
    company: "RetailMax",
    avatar: "PM",
    rating: 5,
    text: "I was skeptical about a complete redesign, but karmakoders delivered a visually stunning e-commerce experience. Sales jumped 180% within 60 days of launch. Absolutely phenomenal work.",
    result: "180% Sales Increase",
    highlight: "bg-rose-500/10 border-rose-500/20",
  },
  {
    name: "James Chen",
    role: "CTO",
    company: "CloudBridge SaaS",
    avatar: "JC",
    rating: 5,
    text: "Their full-stack capabilities are unmatched. From database architecture to pixel-perfect UI, karmakoders delivered a complex SaaS platform on time and under budget. Exceptional team.",
    result: "On Time & Under Budget",
    highlight: "bg-blue-500/10 border-blue-500/20",
  },
];

export function FeedbackSection() {
  const [active, setActive] = useState(0);

  const prev = () => setActive((a) => (a === 0 ? testimonials.length - 1 : a - 1));
  const next = () => setActive((a) => (a === testimonials.length - 1 ? 0 : a + 1));

  const current = testimonials[active];

  return (
    <section id="testimonials" aria-label="Client testimonials" className="pb-20 sm:pb-32 px-4 sm:px-6 md:px-12 bg-slate-950 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-indigo-500 opacity-[0.03] blur-[180px] rounded-full pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <div className="items-start mb-20">
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
            className="text-5xl md:text-6xl font-black text-white tracking-tight"
          >
            What Our Clients<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-indigo-400">Actually Say</span>
          </motion.h2>
        </div>

        {/* Main Testimonial Card */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
          {/* Sidebar list */}
          <div className="space-y-4 hidden lg:block">
            {testimonials.map((t, i) => (
              <button
                key={i}
                onClick={() => setActive(i)}
                className={`w-full text-left p-5 rounded-2xl border transition-all duration-300 ${
                  i === active
                    ? "bg-indigo-500/10 border-indigo-500/40 shadow-indigo-500/10"
                    : "bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/10"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shrink-0 ${i === active ? "bg-indigo-500 text-slate-950" : "bg-white/10 text-white"}`}>
                    {t.avatar}
                  </div>
                  <div>
                    <p className={`font-bold text-sm ${i === active ? "text-indigo-500" : "text-white"}`}>{t.name}</p>
                    <p className="text-slate-500 text-xs">{t.company}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Main Featured Card */}
          <div className="lg:col-span-2">
            <AnimatePresence mode="wait">
              <motion.div
                key={active}
                initial={{ opacity: 0, y: 20, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.97 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
                className="p-10 md:p-14 rounded-[2.5rem] bg-white/5 backdrop-blur-2xl border border-white/10 hover:border-indigo-500/30 transition-colors duration-500 relative"
              >
                {/* Quote Icon */}
                <Quote className="w-16 h-16 text-indigo-500/20 absolute top-8 right-8" />

                {/* Stars */}
                <div className="flex gap-1.5 mb-8">
                  {[...Array(current.rating)].map((_, i) => (
                    <Star key={i} className="w-6 h-6 text-indigo-500 fill-indigo-500" />
                  ))}
                </div>

                {/* Quote */}
                <p className="text-white text-xl md:text-2xl font-medium leading-relaxed mb-10 italic">
                  &ldquo;{current.text}&rdquo;
                </p>

                {/* Result Badge */}
                <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-bold mb-10 ${current.highlight}`}>
                  <span className="w-2 h-2 rounded-full bg-indigo-500" />
                  <span className="text-indigo-500">Result:</span>
                  <span className="text-white">{current.result}</span>
                </div>

                {/* Author */}
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-5">
                    <div className="w-16 h-16 rounded-2xl bg-indigo-500 flex items-center justify-center font-black text-xl text-slate-950 shadow-indigo-500/30">
                      {current.avatar}
                    </div>
                    <div>
                      <p className="text-white font-black text-xl">{current.name}</p>
                      <p className="text-[#D6D6D6] font-medium">{current.role} · {current.company}</p>
                    </div>
                  </div>

                  {/* Navigation */}
                  <div className="flex gap-3">
                    <button
                      onClick={prev}
                      aria-label="Previous testimonial"
                      className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-indigo-500 hover:text-slate-950 hover:border-indigo-500 hover:shadow-indigo-500/20 transition-all"
                    >
                      <ChevronLeft className="w-5 h-5" aria-hidden="true" />
                    </button>
                    <button
                      onClick={next}
                      aria-label="Next testimonial"
                      className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-indigo-500 hover:text-slate-950 hover:border-indigo-500 hover:shadow-indigo-500/20 transition-all"
                    >
                      <ChevronRight className="w-5 h-5" aria-hidden="true" />
                    </button>
                  </div>
                </div>

                {/* Progress dots */}
                <div className="flex gap-2 mt-8" role="tablist" aria-label="Testimonial navigation">
                  {testimonials.map((t, i) => (
                    <button
                      key={i}
                      role="tab"
                      aria-selected={i === active}
                      aria-label={`Testimonial from ${t.name}`}
                      onClick={() => setActive(i)}
                      className={`h-1.5 rounded-full transition-all duration-300 ${i === active ? "w-8 bg-indigo-500" : "w-4 bg-white/20 hover:bg-white/40"}`}
                    />
                  ))}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Bottom metric strip */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6"
        >
          {[
            { value: "5.0 ★", label: "Average Rating" },
            { value: "150+", label: "Happy Clients" },
            { value: "98%", label: "Would Recommend" },
            { value: "0", label: "Projects Abandoned" },
          ].map((stat) => (
            <div key={stat.label} className="text-center p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-indigo-500/30 transition-colors group">
              <p className="text-3xl font-black text-white group-hover:text-indigo-500 transition-colors mb-2">{stat.value}</p>
              <p className="text-[#D6D6D6] text-sm font-medium">{stat.label}</p>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
