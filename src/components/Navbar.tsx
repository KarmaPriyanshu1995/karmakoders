"use client";

import React, { useEffect, useId, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { PRIMARY_NAV, START_PROJECT_HREF, navItemIsActive, type NavItem } from "@/lib/content/nav";

function MegaMenu({ item, open }: { item: NavItem; open: boolean }) {
  if (!item.children?.length || !open) return null;
  return (
    <div className="absolute top-full left-1/2 -translate-x-1/2 pt-3 min-w-[320px]">
      <div className="rounded-2xl border border-white/10 bg-slate-950/95 backdrop-blur-xl shadow-2xl p-3 grid gap-1">
        {item.children.map((child) => (
          <Link
            key={child.href}
            href={child.href}
            className="rounded-xl px-4 py-3 hover:bg-white/5 transition-colors"
          >
            <span className="block text-sm font-semibold text-white">{child.name}</span>
            {child.description ? <span className="block text-xs text-slate-400 mt-1">{child.description}</span> : null}
          </Link>
        ))}
      </div>
    </div>
  );
}

export function Navbar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [mobileSection, setMobileSection] = useState<string | null>(null);
  const menuId = useId();

  useEffect(() => {
    setMounted(true);
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setIsOpen(false);
    setOpenMenu(null);
    setMobileSection(null);
  }, [pathname]);

  return (
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-500 border-b",
        scrolled
          ? "py-4 bg-slate-950/90 backdrop-blur-xl border-white/10 shadow-lg"
          : "py-6 bg-slate-950/40 backdrop-blur-md border-transparent"
      )}
    >
      <div className="max-w-7xl mx-auto px-6 md:px-12 flex items-center justify-between">
        <Link href="/" className="text-2xl font-bold tracking-tighter text-white flex items-center gap-1">
          Karmakoders
        </Link>

        <nav className="[display:none] lg:[display:flex] items-center gap-1 text-sm font-medium text-slate-300" aria-label="Primary">
          {PRIMARY_NAV.map((item) => {
            const isActive = mounted && navItemIsActive(pathname, item);
            const expanded = openMenu === item.name;
            return (
              <div
                key={item.name}
                className="relative"
                onMouseEnter={() => item.children && setOpenMenu(item.name)}
                onMouseLeave={() => setOpenMenu((current) => (current === item.name ? null : current))}
              >
                {item.children ? (
                  <div className="inline-flex items-center">
                    <Link
                      href={item.href}
                      className={cn(
                        "inline-flex items-center px-3 py-2 rounded-lg hover:text-white transition-colors",
                        isActive ? "text-white font-semibold" : ""
                      )}
                    >
                      {item.name}
                    </Link>
                    <button
                      type="button"
                      className={cn(
                        "inline-flex items-center py-2 pr-3 -ml-1 rounded-lg hover:text-white transition-colors",
                        isActive ? "text-white" : ""
                      )}
                      aria-expanded={expanded}
                      aria-haspopup="true"
                      aria-controls={`${menuId}-${item.name}`}
                      aria-label={`${item.name} menu`}
                      onClick={() => setOpenMenu(expanded ? null : item.name)}
                      onFocus={() => setOpenMenu(item.name)}
                    >
                      <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", expanded && "rotate-180")} />
                    </button>
                  </div>
                ) : (
                  <Link
                    href={item.href}
                    className={cn(
                      "inline-flex px-3 py-2 rounded-lg hover:text-white transition-colors relative",
                      isActive ? "text-white font-semibold" : ""
                    )}
                  >
                    {item.name}
                  </Link>
                )}
                {isActive && (
                  <motion.span
                    layoutId="navbar-indicator"
                    className="absolute -bottom-1 left-3 right-3 h-0.5 bg-indigo-500 rounded-full shadow-[0_0_10px_var(--color-indigo-500)]"
                  />
                )}
                {item.children ? <MegaMenu item={item} open={expanded} /> : null}
              </div>
            );
          })}
        </nav>

        <div className="flex items-center gap-4">
          <Link
            href={START_PROJECT_HREF}
            className="inline-flex max-lg:hidden px-6 py-2.5 bg-indigo-500 hover:bg-indigo-500/90 text-slate-950 text-sm font-bold rounded-xl transition-all duration-300 shadow-indigo-500/20 hover:shadow-indigo-500/40 hover:-translate-y-0.5 active:scale-95"
          >
            Start Project
          </Link>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="[display:inline-flex] lg:[display:none] p-2 text-[#D6D6D6] hover:text-indigo-500 transition-colors rounded-xl border border-white/10 bg-white/5 backdrop-blur-md"
            aria-label="Toggle navigation menu"
            aria-expanded={isOpen}
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            className="absolute top-full left-0 right-0 bg-slate-900 border-b border-white/10 backdrop-blur-2xl p-6 flex flex-col gap-4 shadow-2xl z-40 max-h-[80vh] overflow-y-auto"
          >
            {PRIMARY_NAV.map((item) => {
              const isActive = mounted && navItemIsActive(pathname, item);
              const expanded = mobileSection === item.name;
              return (
                <div key={item.name} className="border-b border-white/5 pb-3">
                  {item.children ? (
                    <>
                      <div className="w-full flex items-center justify-between gap-3">
                        <Link
                          href={item.href}
                          onClick={() => setIsOpen(false)}
                          className={cn(
                            "text-lg font-medium",
                            isActive ? "text-indigo-400" : "text-[#D6D6D6]"
                          )}
                        >
                          {item.name}
                        </Link>
                        <button
                          type="button"
                          onClick={() => setMobileSection(expanded ? null : item.name)}
                          className={cn(
                            "p-1 rounded-lg",
                            isActive ? "text-indigo-400" : "text-[#D6D6D6]"
                          )}
                          aria-expanded={expanded}
                          aria-label={`${item.name} menu`}
                        >
                          <ChevronDown className={cn("w-4 h-4 transition-transform", expanded && "rotate-180")} />
                        </button>
                      </div>
                      {expanded && (
                        <div className="mt-3 ml-2 flex flex-col gap-3">
                          {item.children.map((child) => (
                            <Link
                              key={child.href}
                              href={child.href}
                              onClick={() => setIsOpen(false)}
                              className="text-slate-300 hover:text-white"
                            >
                              {child.name}
                            </Link>
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <Link
                      href={item.href}
                      onClick={() => setIsOpen(false)}
                      className={cn("text-lg font-medium", isActive ? "text-indigo-400" : "text-[#D6D6D6]")}
                    >
                      {item.name}
                    </Link>
                  )}
                </div>
              );
            })}
            <Link
              href={START_PROJECT_HREF}
              onClick={() => setIsOpen(false)}
              className="w-full text-center py-4 mt-2 bg-indigo-500 text-slate-950 font-bold rounded-xl shadow-indigo-500/30 active:scale-95 transition-all"
            >
              Start Project
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
