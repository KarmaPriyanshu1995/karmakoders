"use client";

import { motion } from "framer-motion";

interface ContentSectionProps {
  tagline?: string;
  heading?: string;
  body?: string;
  className?: string;
}

export function ContentSection({
  tagline,
  heading,
  body = "",
  className = "",
}: ContentSectionProps) {
  return (
    <section className={`pt-28 sm:pt-32 pb-20 sm:pb-32 px-8 md:px-24 bg-slate-950 ${className}`}>
      <div className="max-w-4xl mx-auto">
        {(tagline || heading) && (
          <div className="mb-12 text-center">
            {tagline && (
              <motion.span
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 backdrop-blur-xl border border-white/10 text-indigo-500 text-sm font-bold tracking-widest uppercase shadow-indigo-500/10 shadow-[0_0_15px_rgba(var(--color-indigo-500-rgb),0.1)]"
              >
                {tagline}
              </motion.span>
            )}
            {heading && (
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
                className="mt-4 text-4xl md:text-5xl font-bold text-white"
              >
                {heading}
              </motion.h2>
            )}
          </div>
        )}
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="prose prose-invert prose-indigo max-w-none"
        >
          <div 
            className="text-slate-300 space-y-6 leading-relaxed text-lg text-center"
            dangerouslySetInnerHTML={{ __html: body }} 
          />
        </motion.div>
      </div>
    </section>
  );
}
