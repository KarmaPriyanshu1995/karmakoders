"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export function Navbar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    setMounted(true);
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { name: "Services", href: "/services" },
    { name: "Portfolio", href: "/portfolio" },
    { name: "Pricing", href: "/pricing" },
    { name: "About", href: "/about" },
    { name: "Blog", href: "/blog" },
    { name: "Careers", href: "/careers" },
  ];

  return (
    <motion.header 
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-500 border-b",
        scrolled ? "py-4 bg-slate-950/80 backdrop-blur-xl border-white/10 shadow-[0_4px_30px_rgba(0,0,0,0.1)]" : "py-6 bg-transparent border-transparent"
      )}
    >
      <div className="max-w-7xl mx-auto px-6 md:px-12 flex items-center justify-between">
        <Link href="/" className="text-2xl font-bold tracking-tighter text-white flex items-center gap-1 group">
          Karmakoders
          {/* <span className="text-indigo-500 transition-transform group-hover:scale-110 inline-block">.ai</span> */}
        </Link>
        
        {/* Desktop Navigation */}
        <nav className="[display:none] lg:[display:flex] gap-8 text-sm font-medium text-slate-300">
          {navLinks.map((link) => {
            const isActive = mounted && pathname === link.href;
            return (
              <Link 
                key={link.name} 
                href={link.href}
                className={cn(
                  "hover:text-white transition-colors relative py-1 group",
                  isActive ? "text-white font-semibold" : ""
                )}
              >
                {link.name}
                {isActive && (
                  <motion.span 
                    layoutId="navbar-indicator"
                    className="absolute -bottom-1 left-0 right-0 h-0.5 bg-indigo-500 rounded-full shadow-[0_0_10px_var(--color-indigo-500)]" 
                  />
                )}
                {!isActive && (
                  <span className="absolute -bottom-1 left-0 right-0 h-0.5 bg-indigo-500 rounded-full scale-x-0 group-hover:scale-x-100 origin-left transition-transform duration-300 ease-out shadow-[0_0_10px_var(--color-indigo-500)] opacity-0 group-hover:opacity-100" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Action Buttons & Hamburger Menu */}
        <div className="flex items-center gap-4">
          <Link
            href="/contact"
            className="inline-flex max-lg:hidden px-6 py-2.5 bg-indigo-500 hover:bg-indigo-500/90 text-slate-950 text-sm font-bold rounded-xl transition-all duration-300 shadow-indigo-500/20 hover:shadow-indigo-500/40 hover:-translate-y-0.5 active:scale-95"
          >
            Start Project
          </Link>

          {/* Hamburger Toggle Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="[display:inline-flex] lg:[display:none] p-2 text-[#D6D6D6] hover:text-indigo-500 transition-colors rounded-xl border border-white/10 bg-white/5 backdrop-blur-md"
            aria-label="Toggle navigation menu"
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile/Tablet Menu Drawer */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            className="absolute top-full left-0 right-0 bg-slate-950/95 border-b border-white/10 backdrop-blur-2xl p-8 flex flex-col gap-6 shadow-2xl z-40"
          >
            <nav className="flex flex-col gap-5 items-center">
              {navLinks.map((link) => {
                const isActive = mounted && pathname === link.href;
                return (
                  <Link
                    key={link.name}
                    href={link.href}
                    onClick={() => setIsOpen(false)}
                    className={cn(
                      "text-xl font-medium transition-colors hover:text-white flex items-center justify-between group",
                      isActive ? "text-indigo-500 font-semibold" : "text-[#D6D6D6]"
                    )}
                  >
                    {link.name}
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity text-indigo-500 tracking-widest">→</span>
                  </Link>
                );
              })}
            </nav>

            <Link
              href="/contact"
              onClick={() => setIsOpen(false)}
              className="w-full text-center py-4 mt-4 bg-indigo-500 text-slate-950 font-bold rounded-xl shadow-indigo-500/30 active:scale-95 transition-all"
            >
              Start Project
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
