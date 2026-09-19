"use client";

import { motion } from "framer-motion";
import { Quote, Star } from "lucide-react";
import { type Testimonial } from "@/lib/social-proof";
import { useSiteContent } from "@/components/SiteContentProvider";

interface TestimonialsProps {
  tagline?: string;
  heading?: string;
  testimonials?: Testimonial[] | Array<Record<string, unknown>>;
  compact?: boolean;
}

function asText(value: unknown) {
  return typeof value === "string" ? value : "";
}

function normalizeTestimonials(list: unknown[]): Testimonial[] {
  return list.map((raw) => {
    const item = (raw ?? {}) as Record<string, unknown>;
    return {
      quote: asText(item.quote) || asText(item.content),
      name: asText(item.name) || asText(item.author) || "Client",
      role: asText(item.role),
      company: asText(item.company),
      country: asText(item.country),
      linkedin: asText(item.linkedin) || undefined,
      videoUrl: asText(item.videoUrl) || undefined,
    };
  });
}

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function TestimonialsSection({
  tagline = "Testimonials",
  heading = "What Our Clients Say",
  testimonials,
  compact = false,
}: TestimonialsProps) {
  const live = useSiteContent();
  const cards = normalizeTestimonials(testimonials ?? live.testimonials).slice(0, 3);

  return (
    <section
      id="testimonials"
      aria-label="Client testimonials"
      className={`${compact ? "py-12" : "py-20 sm:py-32"} px-4 sm:px-6 md:px-12 bg-slate-900/20`}
    >
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12 sm:mb-16">
          <motion.span
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-indigo-400 text-sm font-semibold uppercase tracking-widest"
          >
            {tagline}
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="mt-4 text-4xl md:text-5xl font-bold text-white"
          >
            {heading}
          </motion.h2>
          <p className="mt-3 text-xs text-slate-500">Placeholder quotes — swap from src/lib/social-proof.ts when Lucky sends approved copy.</p>
        </div>

        <div className="flex gap-6 overflow-x-auto snap-x snap-mandatory pb-4 lg:grid lg:grid-cols-3 lg:overflow-visible lg:pb-0">
          {cards.map((testimonial, i) => (
            <motion.div
              key={testimonial.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="min-w-[85%] sm:min-w-[70%] lg:min-w-0 snap-center p-8 rounded-3xl bg-slate-900/40 border border-slate-800 relative flex flex-col justify-between"
            >
              <div>
                <Quote className="w-10 h-10 text-indigo-500/30 mb-6" />
                <div className="flex gap-1 mb-6">
                  {[...Array(5)].map((_, star) => (
                    <Star key={star} className="w-4 h-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-slate-300 text-lg italic leading-relaxed mb-8">
                  &quot;{testimonial.quote}&quot;
                </p>
                {testimonial.videoUrl ? (
                  <div className="mb-6 aspect-video rounded-xl overflow-hidden border border-white/10">
                    <iframe
                      src={testimonial.videoUrl}
                      title={`${testimonial.name} video testimonial`}
                      className="w-full h-full"
                      loading="lazy"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                ) : null}
              </div>

              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full border-2 border-indigo-500/20 bg-white/5 flex items-center justify-center text-indigo-400 font-black">
                  {initials(testimonial.name)}
                </div>
                <div>
                  <h4 className="text-white font-bold">{testimonial.name}</h4>
                  <p className="text-slate-500 text-sm">
                    {testimonial.role} at {testimonial.company} · {testimonial.country}
                  </p>
                  {testimonial.linkedin ? (
                    <a
                      href={testimonial.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-indigo-400 hover:text-indigo-300"
                    >
                      LinkedIn
                    </a>
                  ) : null}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
