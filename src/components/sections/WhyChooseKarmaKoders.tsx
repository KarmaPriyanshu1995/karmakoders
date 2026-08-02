"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Code2, GitBranch, Layers, Handshake, ArrowRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

// Shimmer skeleton loader for the entire section
export function WhyChooseKarmaKodersSkeleton() {
  return (
    <section className="py-24 px-4 sm:px-6 md:px-12 bg-slate-950 relative overflow-hidden">
      {/* Background ambient glow */}
      <div className="absolute top-1/2 left-1/2 w-[500px] h-[500px] bg-indigo-500/5 blur-[120px] rounded-full pointer-events-none -translate-x-1/2 -translate-y-1/2" />
      
      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header Skeleton */}
        <div className="text-center max-w-3xl mx-auto mb-20 animate-pulse">
          <div className="h-6 bg-white/5 border border-white/5 rounded-full w-48 mx-auto mb-6" />
          <div className="h-12 bg-white/5 rounded-xl w-3/4 mx-auto mb-4" />
          <div className="h-4 bg-white/5 rounded w-5/6 mx-auto mt-2" />
          <div className="h-4 bg-white/5 rounded w-2/3 mx-auto mt-2" />
        </div>

        {/* Value Proposition Cards Grid Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-20">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="p-8 rounded-[2rem] bg-white/5 border border-white/5 flex flex-col justify-between h-[340px] animate-pulse"
            >
              <div>
                {/* Icon box skeleton */}
                <div className="w-14 h-14 rounded-2xl bg-white/5 mb-8" />
                {/* Title skeleton */}
                <div className="h-6 bg-white/5 rounded w-2/3 mb-4" />
                {/* Description skeleton */}
                <div className="space-y-2">
                  <div className="h-4 bg-white/5 rounded w-full" />
                  <div className="h-4 bg-white/5 rounded w-5/6" />
                  <div className="h-4 bg-white/5 rounded w-4/5" />
                  <div className="h-4 bg-white/5 rounded w-3/4" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* CTA Banner Skeleton */}
        <div className="relative rounded-[2.5rem] p-12 md:p-16 overflow-hidden bg-white/5 border border-white/5 text-center max-w-5xl mx-auto animate-pulse">
          <div className="h-10 bg-white/5 rounded-lg w-2/3 mx-auto mb-4" />
          <div className="h-4 bg-white/5 rounded w-1/2 mx-auto mb-8" />
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <div className="h-14 bg-white/5 rounded-xl w-48 mx-auto sm:mx-0" />
            <div className="h-14 bg-white/5 rounded-xl w-56 mx-auto sm:mx-0" />
          </div>
        </div>
      </div>
    </section>
  );
}

const defaultCards = [
  {
    title: "Modern Technology",
    description: "Build with today's best technologies, frameworks, and cloud platforms to ensure long-term scalability. We design and deliver custom software development and scalable software architectures.",
    icon: Code2,
    gradient: "from-indigo-500/20 via-indigo-500/10 to-transparent",
    iconColor: "text-indigo-400",
  },
  {
    title: "Transparent Development",
    description: "Stay informed through milestone-based delivery, regular progress updates, and clear communication from start to finish. Our digital product development methodology ensures no surprises.",
    icon: GitBranch,
    gradient: "from-purple-500/20 via-purple-500/10 to-transparent",
    iconColor: "text-purple-400",
  },
  {
    title: "Built to Scale",
    description: "Every application is designed with performance, maintainability, and future growth in mind. We build cutting-edge web development, mobile app development, and AI solutions.",
    icon: Layers,
    gradient: "from-emerald-500/20 via-emerald-500/10 to-transparent",
    iconColor: "text-emerald-400",
  },
  {
    title: "Long-Term Partnership",
    description: "From planning to launch and beyond, we remain your technology partner for continuous improvements and support. We help you maintain secure, scalable systems at every stage.",
    icon: Handshake,
    gradient: "from-amber-500/20 via-amber-500/10 to-transparent",
    iconColor: "text-amber-400",
  },
];

interface WhyChooseKarmaKodersProps {
  tagline?: string;
  heading?: string;
  subtitle?: string;
  cards?: typeof defaultCards;
  ctaHeading?: string;
  ctaText?: string;
  ctaPrimaryText?: string;
  ctaSecondaryText?: string;
  isLoading?: boolean;
}

export function WhyChooseKarmaKoders({
  tagline = "Why Choose KarmaKoders",
  heading = "Why Businesses Choose KarmaKoders",
  subtitle = "We combine modern engineering, transparent collaboration, and scalable technology to help businesses build digital products with confidence.",
  cards = defaultCards,
  ctaHeading = "Ready to Build Something Exceptional?",
  ctaText = "Let's discuss your project goals and create a solution tailored to your business.",
  ctaPrimaryText = "Book a Discovery Call",
  ctaSecondaryText = "Get a Free Project Estimate",
  isLoading: initialIsLoading,
}: WhyChooseKarmaKodersProps) {
  // Handle simulated mounting loading state to showcase the skeleton loader
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // If isLoading is explicitly passed as a prop, respect it.
    // Otherwise, simulate a premium mount loading delay.
    if (initialIsLoading !== undefined) {
      setLoading(initialIsLoading);
      return;
    }

    const timer = setTimeout(() => {
      setLoading(false);
    }, 900); // 900ms shimmering skeleton animation

    return () => clearTimeout(timer);
  }, [initialIsLoading]);

  return (
    <AnimatePresence mode="wait">
      {loading ? (
        <motion.div
          key="skeleton"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <WhyChooseKarmaKodersSkeleton />
        </motion.div>
      ) : (
        <motion.section
          key="content"
          id="why-choose-us-trust"
          aria-label="Why businesses choose KarmaKoders"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="py-24 px-4 sm:px-6 md:px-12 bg-slate-950 relative overflow-hidden"
        >
          {/* Ambient light glow spots */}
          <div className="absolute top-1/4 left-0 w-[500px] h-[500px] bg-indigo-500/5 blur-[140px] rounded-full pointer-events-none" />
          <div className="absolute bottom-1/4 right-0 w-[500px] h-[500px] bg-purple-500/5 blur-[140px] rounded-full pointer-events-none" />

          <div className="max-w-7xl mx-auto relative z-10">
            {/* Header */}
            <div className="text-center max-w-3xl mx-auto mb-20">
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 backdrop-blur-xl border border-white/10 text-indigo-400 text-sm font-bold tracking-widest uppercase mb-6"
              >
                {tagline}
              </motion.div>
              
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="text-4xl md:text-5xl lg:text-6xl font-black text-white tracking-tight leading-tight mb-6"
              >
                {heading}
              </motion.h2>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="text-lg md:text-xl text-slate-400 leading-relaxed font-medium"
              >
                {subtitle}
              </motion.p>
            </div>

            {/* Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-20">
              {cards.map((card, i) => {
                const CardIcon = card.icon;
                return (
                  <motion.div
                    key={card.title}
                    initial={{ opacity: 0, y: 25 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: i * 0.1, ease: "easeOut" }}
                    className="group relative p-8 rounded-[2rem] bg-white/5 border border-white/10 hover:border-indigo-500/30 hover:bg-white/10 hover:-translate-y-2 hover:shadow-[0_15px_40px_rgba(0,0,0,0.4)] transition-all duration-300 flex flex-col justify-between h-full min-h-[320px]"
                  >
                    {/* Hover Glow Gradient */}
                    <div className={cn(
                      "absolute inset-0 rounded-[2rem] bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10 pointer-events-none blur-sm",
                      card.gradient
                    )} />

                    <div>
                      {/* Icon container */}
                      <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-white/10 flex items-center justify-center mb-8 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 shadow-lg">
                        <CardIcon className={cn("w-6 h-6", card.iconColor)} />
                      </div>

                      {/* Card Heading */}
                      <h3 className="text-xl font-extrabold text-white mb-4 tracking-tight group-hover:text-indigo-400 transition-colors duration-300">
                        {card.title}
                      </h3>

                      {/* Card Description */}
                      <p className="text-slate-400 text-sm leading-relaxed font-medium">
                        {card.description}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* CTA Banner */}
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="relative rounded-[2.5rem] p-12 md:p-16 overflow-hidden bg-gradient-to-r from-slate-900/90 to-slate-950 border border-white/10 text-center max-w-5xl mx-auto shadow-2xl"
            >
              {/* Radial gradient inside CTA */}
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(79,70,229,0.08),transparent_70%)] pointer-events-none" />

              <h3 className="text-3xl md:text-4xl lg:text-5xl font-black text-white mb-4 tracking-tight leading-tight">
                {ctaHeading}
              </h3>
              
              <p className="text-lg text-slate-400 mb-8 max-w-2xl mx-auto font-medium">
                {ctaText}
              </p>

              <div className="flex flex-col sm:flex-row justify-center gap-5 w-full max-w-md mx-auto">
                <Link
                  href="/contact"
                  className="px-8 py-4 bg-indigo-500 hover:bg-indigo-500/90 text-slate-950 text-md font-bold rounded-xl transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-indigo-500/20 text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
                  aria-label="Book a discovery call to discuss your custom software development or AI solutions project"
                >
                  {ctaPrimaryText}
                </Link>
                <Link
                  href="/contact?type=estimate"
                  className="px-8 py-4 bg-white/5 hover:bg-white/10 text-white text-md font-bold rounded-xl border border-white/10 hover:border-indigo-500/30 transition-all duration-300 hover:-translate-y-0.5 text-center flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
                  aria-label="Get a free project estimate for your web development or mobile app development project"
                >
                  {ctaSecondaryText}
                  <ArrowRight className="w-4 h-4 text-indigo-400 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </motion.div>
          </div>
        </motion.section>
      )}
    </AnimatePresence>
  );
}
