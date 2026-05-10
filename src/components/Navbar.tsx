"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";

export function Navbar() {
  const pathname = usePathname();

  const navLinks = [
    { name: "Services", href: "/services" },
    { name: "Portfolio", href: "/portfolio" },
    { name: "About", href: "/about" },
    { name: "Blog", href: "/blog" },
    { name: "Careers", href: "/careers" },
  ];

  return (
    <header className="py-6 px-8 flex items-center justify-between glass sticky top-0 z-50">
      <Link href="/" className="text-2xl font-bold tracking-tighter text-white">
        karmakoders<span className="text-indigo-400">.ai</span>
      </Link>
      
      <nav className="hidden md:flex gap-8 text-sm font-medium text-slate-300">
        {navLinks.map((link) => (
          <Link 
            key={link.name} 
            href={link.href}
            className={`hover:text-white transition-colors relative ${pathname === link.href ? 'text-white font-bold' : ''}`}
          >
            {link.name}
            {pathname === link.href && (
              <motion.div 
                layoutId="nav-underline"
                className="absolute -bottom-1 left-0 right-0 h-0.5 bg-indigo-500"
              />
            )}
          </Link>
        ))}
      </nav>

      <Link
        href="/#contact"
        className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-full transition-all shadow-[0_0_15px_rgba(79,70,229,0.5)]"
      >
        Start Project
      </Link>
    </header>
  );
}
