"use client";

import { motion } from "framer-motion";

interface FaqItem {
  question?: string;
  answer?: string;
}

interface ContentSectionProps {
  h1?: string;
  tagline?: string;
  heading?: string;
  subheading?: string;
  body?: string;
  secondaryBody?: string;
  imageUrl?: string;
  imageAlt?: string;
  imageTitle?: string;
  ctaText?: string;
  ctaUrl?: string;
  internalLinkText?: string;
  internalLinkUrl?: string;
  faqs?: FaqItem[];
  className?: string;
}

export function ContentSection({
  h1,
  tagline,
  heading,
  subheading,
  body = "",
  secondaryBody = "",
  imageUrl,
  imageAlt,
  imageTitle,
  ctaText,
  ctaUrl,
  internalLinkText,
  internalLinkUrl,
  faqs = [],
  className = "",
}: ContentSectionProps) {
  const mainTitle = h1 || heading;

  return (
    <section className={`py-24 px-8 md:px-24 bg-slate-950 ${className}`}>
      <div className="max-w-4xl mx-auto">
        {(tagline || mainTitle || subheading) && (
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
            {h1 ? (
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
                className="mt-4 text-4xl md:text-5xl font-bold text-white"
              >
                {h1}
              </motion.h1>
            ) : heading ? (
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
                className="mt-4 text-4xl md:text-5xl font-bold text-white"
              >
                {heading}
              </motion.h2>
            ) : null}
            {h1 && heading && (
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.12 }}
                className="mt-4 text-2xl md:text-3xl font-semibold text-slate-200"
              >
                {heading}
              </motion.h2>
            )}
            {subheading && (
              <motion.h3
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.14 }}
                className="mt-3 text-xl text-slate-400"
              >
                {subheading}
              </motion.h3>
            )}
          </div>
        )}

        {imageUrl && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.15 }}
            className="mb-10 rounded-2xl overflow-hidden border border-slate-800"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt={imageAlt || h1 || heading || "Section image"}
              title={imageTitle}
              className="w-full h-auto object-cover"
            />
          </motion.div>
        )}

        {body && (
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
        )}

        {secondaryBody && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.25 }}
            className="prose prose-invert prose-indigo max-w-none mt-8"
          >
            <div
              className="text-slate-400 space-y-4 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: secondaryBody }}
            />
          </motion.div>
        )}

        {(ctaText || internalLinkText) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="mt-10 flex flex-wrap gap-4"
          >
            {ctaText && ctaUrl && (
              <a
                href={ctaUrl}
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-colors"
              >
                {ctaText}
              </a>
            )}
            {internalLinkText && internalLinkUrl && (
              <a
                href={internalLinkUrl}
                className="px-6 py-3 border border-slate-700 hover:border-indigo-500 text-slate-300 hover:text-white font-semibold rounded-xl transition-colors"
              >
                {internalLinkText}
              </a>
            )}
          </motion.div>
        )}

        {faqs.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.35 }}
            className="mt-16 space-y-4"
          >
            <h3 className="text-2xl font-bold text-white">Frequently Asked Questions</h3>
            {faqs.map((faq, i) => (
              <div key={i} className="p-5 rounded-xl bg-white/5 border border-white/10">
                {faq.question && <h4 className="text-white font-semibold mb-2">{faq.question}</h4>}
                {faq.answer && <p className="text-slate-400 text-sm leading-relaxed">{faq.answer}</p>}
              </div>
            ))}
          </motion.div>
        )}
      </div>
    </section>
  );
}
