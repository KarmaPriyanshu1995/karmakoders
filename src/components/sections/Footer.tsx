"use client";

import Link from "next/link";
import { ArrowUp, Mail } from "lucide-react";
import { useState } from "react";
import { motion } from "framer-motion";
import { subscribeNewsletter } from "@/lib/actions";
import { toast } from "sonner";

const footerLinks = {
  Services: [
    { name: "Custom Software", href: "/services#custom-software-development" },
    { name: "Mobile App Dev", href: "/services#mobile-app-development" },
    { name: "AI Integrations", href: "/services#ai-solutions-integrations" },
    { name: "SaaS Products", href: "/services#saas-development" },
    { name: "Web Engineering", href: "/services#website-development" },
    { name: "UI/UX Design", href: "/services#ui-ux-design-branding" },
    { name: "Cloud & DevOps", href: "/services#cloud-engineering-devops" },
  ],
  Company: [
    { name: "About Us", href: "/about" },
    { name: "Portfolio", href: "/portfolio" },
    { name: "Case Studies", href: "/case-studies" },
    { name: "Blog", href: "/blog" },
    { name: "Careers", href: "/careers" },
    { name: "Contact", href: "/contact" },
  ],
  Legal: [
    { name: "Privacy Policy", href: "/privacy" },
    { name: "Terms of Service", href: "/terms" },
    { name: "Cookie Policy", href: "/cookie-policy" },
    { name: "Refund Policy", href: "/refund-policy" },
  ],
};

export function Footer() {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    document.documentElement.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.trim()) {
      toast.error("Please enter a valid email address.");
      return;
    }
    try {
      await subscribeNewsletter(email.trim());
      setSubscribed(true);
      setEmail("");
      toast.success("Subscribed successfully! Thank you.");
    } catch (err) {
      console.error(err);
      toast.error("Failed to subscribe. Please try again.");
    }
  };

  return (
    <footer role="footer" className="relative bg-slate-950/95 border-t border-white/5 overflow-hidden">
      {/* Background Glow */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-indigo-500 opacity-[0.03] blur-[150px] rounded-full pointer-events-none" />

      {/* CTA Banner */}
      <div className="relative border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-12 py-12 sm:py-20 flex flex-col md:flex-row items-center justify-between gap-8">
          <div>
            <p className="text-indigo-500 text-sm font-bold uppercase tracking-widest mb-3">Ready to launch?</p>
            <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight leading-tight">
              Let's build something<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-indigo-400">extraordinary.</span>
            </h2>
          </div>
          <Link
            href="/contact"
            className="shrink-0 px-10 py-5 bg-indigo-500 hover:bg-indigo-500/90 text-slate-950 text-lg font-black rounded-xl transition-all duration-300 shadow-[0_0_30px_var(--color-indigo-500)] hover:shadow-[0_0_40px_var(--color-indigo-500)] hover:-translate-y-1 active:scale-95"
          >
            Start a Project →
          </Link>
        </div>
      </div>

      {/* Main Footer Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-12 pt-12 sm:pt-20 pb-12 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-12 mb-16">

          {/* Brand Column */}
          <div className="lg:col-span-4">
            <Link href="/" className="text-3xl font-black tracking-tight text-white mb-6 block">
              Karmakoders
              {/* <span className="text-indigo-500">.ai</span> */}
            </Link>
            <p className="text-[#D6D6D6] text-base leading-relaxed mb-8 max-w-xs font-medium">
              Designing and engineering the future of the web with advanced AI, immersive 3D experiences, and premium aesthetics.
            </p>

            <div className="flex gap-3 mb-10" role="list" aria-label="Social media links">
              {[
                { href: "https://twitter.com/karmakoders", label: "Twitter", svg: <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"/> },
                { href: "https://linkedin.com/company/karmakoders", label: "LinkedIn", svg: <><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect width="4" height="12" x="2" y="9"/><circle cx="4" cy="4" r="2"/></> },
                { href: "https://github.com/karmakoders", label: "GitHub", svg: <><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/><path d="M9 18c-4.51 2-5-2-7-2"/></> },
                { href: "https://instagram.com/karmakoders", label: "Instagram", svg: <><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></> },
              ].map((item, i) => (
                <a key={i} href={item.href} aria-label={item.label} rel="noopener noreferrer" className="w-11 h-11 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-[#D6D6D6] hover:bg-indigo-500 hover:text-slate-950 hover:border-indigo-500 hover:scale-110 hover:shadow-[0_0_20px_var(--color-indigo-500)] transition-all duration-300">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{item.svg}</svg>
                </a>
              ))}
            </div>

            {/* Newsletter */}
            <div>
              <p className="text-white font-bold text-sm uppercase tracking-widest mb-4">Subscribe to Updates</p>
              {subscribed ? (
                <div className="px-5 py-3 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-500 text-sm font-bold" role="status">
                  ✓ You&apos;re subscribed! Thanks.
                </div>
              ) : (
                <form onSubmit={handleSubscribe} className="flex gap-2">
                  <label htmlFor="footer-email" className="sr-only">Email address</label>
                  <input
                    id="footer-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    required
                    autoComplete="email"
                    className="flex-1 h-12 bg-white/5 border border-white/10 rounded-xl px-4 text-white text-sm placeholder:text-slate-500 focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 transition-all outline-none"
                  />
                  <button type="submit" aria-label="Subscribe to newsletter" className="h-12 w-12 flex items-center justify-center bg-indigo-500 text-slate-950 rounded-xl hover:bg-indigo-500/90 hover:shadow-[0_0_15px_var(--color-indigo-500)] transition-all shrink-0 cursor-pointer">
                    <Mail className="w-5 h-5" aria-hidden="true" />
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* Link Columns */}
          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title} className="lg:col-span-2">
              <h4 className="text-white font-black text-sm uppercase tracking-widest mb-8">{title}</h4>
              <ul className="space-y-4">
                {links.map((link) => (
                  <li key={link.name}>
                    <Link
                      href={link.href}
                      className="text-[#D6D6D6] text-sm font-medium hover:text-indigo-500 transition-colors duration-200 flex items-center gap-1 group"
                    >
                      <span className="opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200 text-indigo-500">›</span>
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Contact Column */}
          <div className="lg:col-span-2">
            <h4 className="text-white font-black text-sm uppercase tracking-widest mb-8">Contact</h4>
            <ul className="space-y-6">
              <li>
                <p className="text-indigo-500 text-xs font-bold uppercase tracking-wider mb-1">Email</p>
                <a href="mailto:info@karmakoders.com" className="text-[#D6D6D6] text-sm font-medium hover:text-indigo-500 transition-colors">info@karmakoders.com</a>
              </li>
              <li>
                <p className="text-indigo-500 text-xs font-bold uppercase tracking-wider mb-1">Phone</p>
                <a href="tel:+918690071861" className="text-[#D6D6D6] text-sm font-medium hover:text-indigo-500 transition-colors">+91 86900 71861</a>
              </li>
              <li>
                <p className="text-indigo-500 text-xs font-bold uppercase tracking-wider mb-1">Office</p>
                <p className="text-[#D6D6D6] text-sm font-medium">JLN Marg, Malviya Nagar,<br />Jaipur, Rajasthan</p>
              </li>
              <li>
                <p className="text-indigo-500 text-xs font-bold uppercase tracking-wider mb-1">Hours</p>
                <p className="text-[#D6D6D6] text-sm font-medium">Mon–Fri: 10AM – 7PM IST</p>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-col md:flex-row items-center gap-4 text-center md:text-left">
            <p className="text-slate-500 text-sm">
              © {new Date().getFullYear()} <span className="text-[#D6D6D6] font-semibold">karmakoders Agency</span>. All rights reserved.
            </p>
            <span className="hidden md:block text-slate-700">•</span>
            <p className="text-slate-600 text-sm">
              Crafted with <span className="text-indigo-500">♥</span> in Jaipur, India
            </p>
          </div>

          <button
            type="button"
            onClick={scrollToTop}
            className="group flex items-center gap-3 text-[#D6D6D6] hover:text-indigo-500 transition-colors"
          >
            <span className="text-xs font-bold uppercase tracking-widest">Back to top</span>
            <div className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center group-hover:bg-indigo-500 group-hover:text-slate-950 group-hover:border-indigo-500 group-hover:shadow-[0_0_15px_var(--color-indigo-500)] transition-all">
              <ArrowUp className="w-5 h-5" />
            </div>
          </button>
        </div>
      </div>
    </footer>
  );
}
