"use client";

import { motion } from "framer-motion";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";

interface NewsletterProps {
  heading?: string;
  description?: string;
}

export function NewsletterSection({
  heading = "Stay Ahead of the Curve",
  description = "Get the latest insights on AI, web design, and digital trends delivered straight to your inbox.",
}: NewsletterProps) {
  return (
    <section className="py-24 px-8 md:px-24 bg-slate-950">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="relative rounded-[48px] bg-gradient-to-br from-indigo-600 to-violet-700 p-12 md:p-20 overflow-hidden text-center"
        >
          {/* Decorative circles */}
          <div className="absolute top-0 left-0 w-64 h-64 bg-white/10 rounded-full -translate-x-1/2 -translate-y-1/2 blur-3xl" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-white/10 rounded-full translate-x-1/3 translate-y-1/3 blur-3xl" />
          
          <div className="relative z-10 max-w-2xl mx-auto">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              {heading}
            </h2>
            <p className="text-indigo-100 text-lg mb-10 leading-relaxed">
              {description}
            </p>
            
            <form className="flex flex-col sm:flex-row gap-4 max-w-lg mx-auto">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 h-14 bg-white/10 border border-white/20 rounded-2xl px-6 text-white placeholder:text-indigo-200 outline-none focus:bg-white/20 transition-all"
              />
              <Button className="h-14 bg-white text-indigo-600 hover:bg-indigo-50 px-8 rounded-2xl font-bold flex items-center justify-center gap-2 group shadow-xl">
                Subscribe Now
                <Send className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
              </Button>
            </form>
            
            <p className="mt-6 text-indigo-200/60 text-xs">
              No spam, ever. Unsubscribe at any time.
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
