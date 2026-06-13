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
    <section className={`py-24 px-8 md:px-24 bg-slate-950 ${className}`}>
      <div className="max-w-4xl mx-auto">
        {(tagline || heading) && (
          <div className="mb-16">
            {tagline && (
              <motion.span
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-indigo-400 text-sm font-semibold uppercase tracking-widest"
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
            className="text-slate-300 space-y-6 leading-relaxed text-lg"
            dangerouslySetInnerHTML={{ __html: body }} 
          />
        </motion.div>
      </div>
    </section>
  );
}
