"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, ChevronLeft, ChevronRight, Quote } from "lucide-react";
import { useSiteContent } from "@/components/SiteContentProvider";

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function FeedbackSection() {
  const { testimonials } = useSiteContent();
  const [active, setActive] = useState(0);
  const slides = testimonials.length ? testimonials : [];
  const current = slides[active] ?? slides[0];

  if (!current) return null;

  const prev = () => setActive((a) => (a === 0 ? slides.length - 1 : a - 1));
  const next = () => setActive((a) => (a === slides.length - 1 ? 0 : a + 1));

  return (
    <section id="testimonials" aria-label="Client feedback" className="py-24 px-4 sm:px-6 md:px-12 bg-slate-950 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-indigo-500 opacity-[0.015] blur-[180px] rounded-full pointer-events-none" />

      <div className="max-w-4xl mx-auto relative z-10">
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

        <div className="relative" role="region" aria-roledescription="carousel" aria-label="Testimonial slides">
          <AnimatePresence mode="wait">
            <motion.div
              key={current.name + active}
              initial={{ opacity: 0, scale: 0.98, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: -15 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="p-8 sm:p-12 md:p-16 rounded-[2.5rem] bg-white/5 backdrop-blur-2xl border border-white/10 hover:border-indigo-500/30 transition-colors duration-500 relative flex flex-col justify-between"
            >
              <Quote className="w-24 h-24 text-indigo-500/10 absolute top-8 right-8 pointer-events-none" />

              <div>
                <p className="text-white text-lg sm:text-xl md:text-2xl leading-relaxed mb-10 italic font-medium">
                  &ldquo;{current.quote}&rdquo;
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 border-t border-white/5 pt-8">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center font-black text-lg text-indigo-500 shadow-indigo-500/5">
                    {initials(current.name)}
                  </div>
                  <div>
                    <h3 className="text-white font-black text-lg">{current.name}</h3>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mt-0.5">
                      {current.role}{current.company ? ` · ${current.company}` : ""}{current.country ? ` · ${current.country}` : ""}
                    </p>
                  </div>
                </div>

                {slides.length > 1 ? (
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
                ) : null}
              </div>

              {slides.length > 1 ? (
                <div className="flex justify-center gap-2 mt-8" role="tablist" aria-label="Feedback slide navigation">
                  {slides.map((slide, i) => (
                    <button
                      key={slide.name + i}
                      role="tab"
                      aria-selected={i === active}
                      aria-label={`Go to slide ${i + 1}`}
                      onClick={() => setActive(i)}
                      className={`h-1.5 rounded-full transition-all duration-300 ${i === active ? "w-8 bg-indigo-500" : "w-3 bg-white/20 hover:bg-white/40"}`}
                    />
                  ))}
                </div>
              ) : null}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
