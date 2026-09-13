"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Home } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/sections/Footer";

const quickLinks = [
  { name: "Services", href: "/services", description: "What we build" },
  { name: "Portfolio", href: "/portfolio", description: "Our work" },
  { name: "Blog", href: "/blog", description: "Latest news" },
  { name: "Contact", href: "/contact", description: "Get in touch" },
];

export function NotFoundView() {
  return (
    <main className="min-h-screen bg-slate-950 flex flex-col">
      <Navbar />

      <section className="flex-1 flex items-center justify-center relative overflow-hidden px-4 sm:px-6 md:px-12">
        <div className="absolute inset-0 z-0 pointer-events-none bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_20%,transparent_100%)]" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500 opacity-[0.06] blur-[180px] rounded-full pointer-events-none" />

        <div className="relative z-10 max-w-3xl mx-auto w-full text-center py-32 sm:py-40">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="mb-8"
          >
            <span className="text-[10rem] sm:text-[14rem] font-black leading-none tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-indigo-500/40 to-indigo-500/5 select-none">
              404
            </span>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 backdrop-blur-xl border border-white/10 text-indigo-500 text-sm font-bold tracking-widest uppercase mb-6"
          >
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse shadow-[0_0_10px_var(--color-indigo-500)]" />
            Page Not Found
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.25 }}
            className="text-3xl sm:text-5xl md:text-6xl font-black text-white tracking-tight leading-tight mb-6"
          >
            Oops! This page doesn&apos;t{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-indigo-400">
              exist.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.35 }}
            className="text-lg text-[#D6D6D6] leading-relaxed max-w-lg mx-auto mb-10 font-medium"
          >
            The page you&apos;re looking for may have been moved, deleted, or never existed. Let&apos;s get you back on track.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.45 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16"
          >
            <Link
              href="/"
              className="px-8 py-4 bg-indigo-500 hover:bg-indigo-500/90 text-slate-950 text-base font-black rounded-xl transition-all duration-300 shadow-[0_0_25px_var(--color-indigo-500)]/30 hover:shadow-[0_0_35px_var(--color-indigo-500)] hover:-translate-y-1 active:scale-95 flex items-center gap-2"
            >
              <Home className="w-5 h-5" />
              Go Home
            </Link>
            <button
              type="button"
              onClick={() => window.history.back()}
              className="px-8 py-4 bg-white/5 backdrop-blur-xl border border-white/10 text-white hover:bg-white/10 text-base font-bold rounded-xl transition-all duration-300 hover:border-indigo-500/30 hover:-translate-y-1 flex items-center gap-2 cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5" />
              Go Back
            </button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.55 }}
          >
            <p className="text-sm font-bold uppercase tracking-widest text-slate-500 mb-6">
              Or try one of these
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {quickLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="group rounded-2xl border border-white/10 bg-white/[0.03] p-4 hover:border-indigo-500/40 hover:bg-indigo-500/5 hover:-translate-y-0.5 transition-all duration-300 text-center"
                >
                  <span className="block text-white font-bold text-sm mb-1 group-hover:text-indigo-400 transition-colors">
                    {link.name}
                  </span>
                  <span className="block text-slate-500 text-xs font-medium">{link.description}</span>
                </Link>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
