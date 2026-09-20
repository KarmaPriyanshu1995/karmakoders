"use client";

import { useEffect, useState, type ComponentType } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { trackEvent } from "@/lib/analytics";
import { ClientLogoStrip } from "@/components/sections/ClientLogoStrip";
import { TrustBadgeStrip } from "@/components/sections/TrustBadgeStrip";

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
    <section id="hero" className={`${pathname === "/" ? "pt-12" : "pt-0"} relative min-h-[100svh] flex items-center justify-center overflow-hidden bg-slate-950`}>
      <div className="absolute inset-0 z-0 opacity-40">
        <LazyHeroCanvas mouseX={mousePosition.x} mouseY={mousePosition.y} />
      </div>

      <div className="absolute inset-0 z-0 pointer-events-none bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_20%,transparent_100%)]" />
      <div className="absolute inset-0 z-0 bg-gradient-to-b from-slate-950/20 via-slate-950/80 to-slate-950" />

      <div className="relative z-10 w-full max-w-7xl mx-auto px-6 md:px-12 pt-28 sm:pt-32 pb-16 text-center md:text-left flex flex-col items-center md:items-start">

        <motion.div
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 backdrop-blur-xl border border-white/10 text-indigo-500 text-sm font-bold tracking-wide mb-8 shadow-indigo-500/10 shadow-[0_0_20px_var(--color-indigo-500)]/15"
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }}
        >
          <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse shadow-[0_0_10px_var(--color-indigo-500)]" />
          {badge}
        </motion.div>

        <motion.h1
          className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-tighter text-white mb-6 leading-[1.05]"
          initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
        >
          {headline}<br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 via-indigo-400 to-indigo-500 text-glow leading-[1.2] pb-2 block">{highlight}</span>
        </motion.h1>

        <motion.p
          className="text-lg md:text-xl text-[#D6D6D6] mb-8 max-w-2xl leading-relaxed md:leading-normal font-medium"
          initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
        >
          {subheadline}
        </motion.p>

        <motion.div
          className="flex flex-wrap justify-center md:justify-start gap-x-6 gap-y-2 mb-10 text-xs font-bold text-slate-400"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.35 }}
        >
          {["✔ NDA Friendly", "✔ Agile Delivery", "✔ AI Powered", "✔ USA Time Zone Support", "✔ Dedicated Team"].map((item) => (
            <span key={item} className="flex items-center gap-1.5 hover:text-indigo-400 transition-colors cursor-default">
              {item}
            </span>
          ))}
        </motion.div>

        <motion.div
          className="flex flex-col sm:flex-row gap-5 w-full md:w-auto"
          initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
        >
          <Link
            href={ctaPrimaryLink}
            onClick={() => trackEvent("cta_click", { location: "hero", cta: "primary" })}
            className="px-10 py-5 bg-indigo-500 hover:bg-indigo-500/90 text-slate-950 text-lg font-black rounded-xl transition-all duration-300 shadow-indigo-500/40 hover:shadow-indigo-500/60 hover:-translate-y-1 w-full sm:w-auto text-center"
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
            className="px-10 py-5 bg-white/5 backdrop-blur-xl border border-white/10 text-white hover:bg-white/10 text-lg font-bold rounded-xl transition-all duration-300 hover:border-indigo-500/30 hover:shadow-indigo-500/10 hover:-translate-y-1 w-full sm:w-auto text-center"
          >
            {pathname === "/" && ctaSecondary === "Get Free Estimate" ? "Estimate my MVP cost" : ctaSecondary}
          </Link>
        </motion.div>

        {pathname === "/" ? <TrustBadgeStrip className="mb-8" /> : null}

        {pathname === "/" ? <ClientLogoStrip /> : null}

      </div>
    </section>
  );
}
