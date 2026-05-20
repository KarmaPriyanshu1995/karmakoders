"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";

export function Navbar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
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
    <header className="py-6 px-8 flex items-center justify-between glass sticky top-0 z-50">
      <Link href="/" className="text-2xl font-bold tracking-tighter text-white">
        karmakoders<span className="text-indigo-400">.ai</span>
      </Link>
      
      {/* Desktop Navigation */}
      <nav className="flex max-lg:hidden gap-8 text-sm font-medium text-slate-300">
        {navLinks.map((link) => {
          const isActive = mounted && pathname === link.href;
          return (
            <Link 
              key={link.name} 
              href={link.href}
              className={`hover:text-white transition-colors relative py-1 ${isActive ? 'text-white font-semibold' : ''}`}
            >
              {link.name}
              {isActive && (
                <span className="absolute -bottom-1 left-0 right-0 h-0.5 bg-indigo-500 rounded-full" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Action Buttons & Hamburger Menu */}
      <div className="flex items-center gap-4">
        <Link
          href="/contact"
          className="inline-flex max-sm:hidden px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-full transition-all shadow-[0_0_15px_rgba(79,70,229,0.5)]"
        >
          Start Project
        </Link>

        {/* Hamburger Toggle Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="hidden max-lg:inline-flex p-2 text-slate-400 hover:text-white transition-colors rounded-full border border-slate-800 bg-slate-950/20 backdrop-blur-md"
          aria-label="Toggle navigation menu"
        >
          {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile/Tablet Menu Drawer */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 bg-slate-950/95 border-b border-slate-900 backdrop-blur-xl p-8 flex flex-col gap-6 max-lg:flex hidden shadow-2xl z-40">
          <nav className="flex flex-col gap-5">
            {navLinks.map((link) => {
              const isActive = mounted && pathname === link.href;
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  onClick={() => setIsOpen(false)}
                  className={`text-lg font-medium transition-colors hover:text-white ${
                    isActive ? "text-indigo-400 font-semibold" : "text-slate-400"
                  }`}
                >
                  {link.name}
                </Link>
              );
            })}
          </nav>

          <Link
            href="/contact"
            onClick={() => setIsOpen(false)}
            className="sm:hidden w-full text-center py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-full transition-all"
          >
            Start Project
          </Link>
        </div>
      )}
    </header>
  );
}
