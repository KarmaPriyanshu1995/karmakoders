"use client";

import { useEffect, useState, type ComponentType } from "react";
import { motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Check } from "lucide-react";
import { trackEvent } from "@/lib/analytics";
import { ClientLogoStrip } from "@/components/sections/ClientLogoStrip";
import { TrustBadgeStrip } from "@/components/sections/TrustBadgeStrip";

const TRUST_POINTS = [
  "NDA Friendly",
  "Agile Delivery",
  "AI Powered",
  "USA Time Zone Support",
  "Dedicated Team",
];

type HeroCanvasProps = { mouseX: number; mouseY: number };

function LazyHeroCanvas(props: HeroCanvasProps) {
  const [Canvas, setCanvas] = useState<ComponentType<HeroCanvasProps> | null>(null);

  useEffect(() => {
    let cancelled = false;
    void import("./HeroCanvas").then((mod) => {
      if (!cancelled) setCanvas(() => mod.HeroCanvas);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!Canvas) return null;
  return <Canvas {...props} />;
}

interface HeroProps {
  badge?: string;
  headline?: string;
  highlight?: string;
  subheadline?: string;
  ctaPrimary?: string;
  ctaSecondary?: string;
  ctaPrimaryLink?: string;
  ctaSecondaryLink?: string;
}

export function HeroSection({
  badge = "US-hours software partner",
  headline = "Ship the product US buyers already expect.",
  highlight = "Senior engineers. EST overlap. NDA first.",
  subheadline = "Custom web, mobile, SaaS, and AI — scoped in USD, built with timezone overlap, and owned by you from day one.",
  ctaPrimary = "Book Discovery Call",
  ctaSecondary = "Estimate my MVP cost",
  ctaPrimaryLink = "/contact",
  ctaSecondaryLink = "/free-tools/mvp-cost-calculator",
}: HeroProps) {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();
  const fadeUp = (delay: number, y = 24) =>
    reduceMotion
      ? { initial: false as const, animate: { opacity: 1, y: 0 } }
      : { initial: { opacity: 0, y }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.7, delay, ease: "easeOut" as const } };
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({
        x: (e.clientX / window.innerWidth) * 2 - 1,
        y: -(e.clientY / window.innerHeight) * 2 + 1,
      });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <section id="hero" className="relative bg-slate-950">
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 opacity-40">
          <LazyHeroCanvas mouseX={mousePosition.x} mouseY={mousePosition.y} />
        </div>
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_20%,transparent_100%)]" />
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/20 via-slate-950/80 to-slate-950" />
      </div>

      <div className="relative z-10 w-full max-w-7xl mx-auto px-6 md:px-12 pt-28 sm:pt-32 lg:pt-36 pb-20 md:pb-24 text-center md:text-left flex flex-col items-center md:items-start">
        <motion.div
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 backdrop-blur-xl border border-white/10 text-indigo-500 text-sm font-bold tracking-wide mb-6 shadow-[0_0_20px_var(--color-indigo-500)]/15"
          {...fadeUp(0.1, 16)}
        >
          <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse shadow-[0_0_10px_var(--color-indigo-500)]" />
          {badge}
        </motion.div>

        <motion.h1
          className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black tracking-tighter text-white mb-5 leading-[1.08]"
          {...fadeUp(0.15, 24)}
        >
          {headline}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 via-indigo-400 to-indigo-500 text-glow leading-[1.2] mt-2 pb-1 block">{highlight}</span>
        </motion.h1>

        <motion.p
          className="text-base sm:text-lg md:text-xl text-[#D6D6D6] max-w-2xl leading-relaxed font-medium"
          {...fadeUp(0.2, 24)}
        >
          {subheadline}
        </motion.p>

        <div className="mt-8 md:mt-10 flex flex-col items-center md:items-start gap-6 md:gap-8 w-full">
          <motion.ul
            className="flex flex-wrap justify-center md:justify-start gap-2 sm:gap-2.5"
            {...fadeUp(0.25, 16)}
          >
            {TRUST_POINTS.map((item) => (
              <li
                key={item}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] sm:text-xs font-semibold text-slate-300 whitespace-nowrap"
              >
                <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0" aria-hidden="true" />
                {item}
              </li>
            ))}
          </motion.ul>

          <motion.div
            className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 w-full sm:w-auto"
            {...fadeUp(0.3, 20)}
          >
            <Link
              href={ctaPrimaryLink}
              onClick={() => trackEvent("cta_click", { location: "hero", cta: "primary" })}
              className="inline-flex items-center justify-center min-h-[52px] px-7 py-3.5 bg-indigo-500 hover:bg-indigo-500/90 text-slate-950 text-base font-black rounded-xl transition-all duration-300 shadow-[0_8px_24px_rgba(255,195,0,0.22)] hover:shadow-[0_10px_28px_rgba(255,195,0,0.32)] hover:-translate-y-0.5 w-full sm:w-auto text-center"
            >
              {ctaPrimary}
            </Link>
            <Link
              href={
                pathname === "/" && ctaSecondaryLink === "/contact?type=estimate"
                  ? "/free-tools/mvp-cost-calculator"
                  : ctaSecondaryLink
              }
              onClick={() => trackEvent("cta_click", { location: "hero", cta: "secondary" })}
              className="inline-flex items-center justify-center min-h-[52px] px-7 py-3.5 bg-white/5 backdrop-blur-xl border border-white/15 text-white hover:bg-white/10 text-base font-bold rounded-xl transition-all duration-300 hover:border-indigo-500/40 w-full sm:w-auto text-center"
            >
              {pathname === "/" && ctaSecondary === "Get Free Estimate" ? "Estimate my MVP cost" : ctaSecondary}
            </Link>
          </motion.div>
        </div>

        {pathname === "/" ? (
          <div className="mt-12 md:mt-14 w-full flex flex-col gap-8">
            <TrustBadgeStrip />
            <ClientLogoStrip compact />
          </div>
        ) : null}
      </div>
    </section>
  );
}
