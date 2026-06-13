"use client";

import { motion } from "framer-motion";
import { Quote, Star } from "lucide-react";
import Image from "next/image";

const defaultTestimonials = [
  {
    content: "karmakoders transformed our digital presence completely. Their AI-driven approach and attention to detail are unparalleled in the industry.",
    author: "Sarah Jenkins",
    role: "CEO at Quantum Pay",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200",
  },
  {
    content: "Working with this team was a game-changer. The 3D animations they built for our platform increased user engagement by over 40%.",
    author: "David Chen",
    role: "Product Lead at Nova Health",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200",
  },
  {
    content: "Professional, innovative, and highly skilled. They didn't just build a website; they built a powerful tool for our business growth.",
    author: "Elena Rodriguez",
    role: "Marketing Director at Aura Home",
    avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=200",
  },
];

interface TestimonialsProps {
  tagline?: string;
  heading?: string;
  testimonials?: typeof defaultTestimonials;
}

export function TestimonialsSection({
  tagline = "Testimonials",
  heading = "What Our Clients Say",
  testimonials = defaultTestimonials,
}: TestimonialsProps) {
  return (
    <section id="testimonials" aria-label="Client testimonials" className="py-20 sm:py-32 px-4 sm:px-6 md:px-12 bg-slate-900/20">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-20">
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
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {testimonials.map((testimonial, i) => (
            <motion.div
              key={testimonial.author}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="p-8 rounded-3xl bg-slate-900/40 border border-slate-800 relative flex flex-col justify-between"
            >
              <div>
                <Quote className="w-10 h-10 text-indigo-500/30 mb-6" />
                <div className="flex gap-1 mb-6">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-slate-300 text-lg italic leading-relaxed mb-8">
                  &quot;{testimonial.content}&quot;
                </p>
              </div>
              
              <div className="flex items-center gap-4">
                <Image
                  src={testimonial.avatar}
                  alt={testimonial.author}
                  width={56}
                  height={56}
                  className="w-14 h-14 rounded-full object-cover border-2 border-indigo-500/20"
                  loading="lazy"
                />
                <div>
                  <h4 className="text-white font-bold">{testimonial.author}</h4>
                  <p className="text-slate-500 text-sm">{testimonial.role}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
