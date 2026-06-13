"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Mail, Phone, MapPin, Send } from "lucide-react";
import { submitContact } from "@/lib/actions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ContactProps {
  isSpace?: boolean;
  tagline?: string;
  heading?: string;
  description?: string;
}

export function ContactSection({
  isSpace = false,
  tagline = "Get In Touch",
  heading = "Let's Start Your Next Digital Project",
  description = "Ready to transform your vision into reality? Our team is standing by to help you navigate your digital journey.",
}: ContactProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await submitContact(formData);
      toast.success("Message sent successfully! We'll get back to you soon.");
      setFormData({ name: "", email: "", phone: "", message: "" });
    } catch (error) {
      toast.error("Failed to send message. Please try again later.");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <section id="contact" aria-label="Contact us" className={`${isSpace ? "py-20 sm:py-32" : "pb-20 sm:pb-32"} px-4 sm:px-6 md:px-12 bg-slate-950 relative overflow-hidden`}>
      {/* Background glowing orb */}
      <div className="absolute top-1/2 right-0 w-[800px] h-[800px] bg-indigo-500 opacity-[0.02] blur-[200px] rounded-full pointer-events-none transform -translate-y-1/2 translate-x-1/4" />

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24">
          
          {/* Left Column: Contact Info */}
          <div>
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 backdrop-blur-xl border border-white/10 text-indigo-500 text-sm font-bold tracking-widest uppercase shadow-indigo-500/10 shadow-[0_0_15px_rgba(var(--color-indigo-500-rgb),0.1)] mb-6"
            >
              {tagline}
            </motion.div>
            <motion.h2
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-5xl md:text-6xl font-black text-white leading-tight tracking-tight"
            >
              {heading}
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="mt-6 text-[#D6D6D6] text-xl leading-relaxed max-w-lg font-medium"
            >
              {description}
            </motion.p>
            
            <div className="mt-16 space-y-10">
              {[
                { icon: Mail, label: "Email Us", value: "info@karmakoders.com" },
                { icon: Phone, label: "Call Us", value: "+91 76270 56875" },
                { icon: MapPin, label: "Visit Us", value: "JLN Marg, Malviya Nagar, Jaipur" },
              ].map((item, i) => (
                <motion.div 
                   key={item.label}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.3 + i * 0.1 }}
                  className="flex items-start gap-6 group cursor-default"
                >
                  <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-white/10 flex items-center justify-center text-indigo-500 shrink-0 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500 shadow-indigo-500/10 group-hover:shadow-indigo-500/30">
                    <item.icon className="w-6 h-6" />
                  </div>
                  <div className="pt-1">
                    <h4 className="text-white font-bold text-xl mb-1 group-hover:text-indigo-500 transition-colors">{item.label}</h4>
                    <p className="text-[#D6D6D6] text-lg">{item.value}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Social Links */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.6 }}
              className="mt-16 pt-10 border-t border-white/10 flex gap-4"
            >
              <a href="#" aria-label="Follow us on Twitter" rel="noopener noreferrer" className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-indigo-500 hover:text-slate-950 hover:border-indigo-500 hover:scale-110 hover:shadow-indigo-500/40 transition-all duration-300">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"/></svg>
              </a>
              <a href="#" aria-label="Follow us on LinkedIn" rel="noopener noreferrer" className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-indigo-500 hover:text-slate-950 hover:border-indigo-500 hover:scale-110 hover:shadow-indigo-500/40 transition-all duration-300">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect width="4" height="12" x="2" y="9"/><circle cx="4" cy="4" r="2"/></svg>
              </a>
              <a href="#" aria-label="Follow us on GitHub" rel="noopener noreferrer" className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-indigo-500 hover:text-slate-950 hover:border-indigo-500 hover:scale-110 hover:shadow-indigo-500/40 transition-all duration-300">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/><path d="M9 18c-4.51 2-5-2-7-2"/></svg>
              </a>
            </motion.div>
          </div>
          
          {/* Right Column: Contact Form */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="p-8 md:p-12 rounded-[2.5rem] bg-white/5 backdrop-blur-2xl border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.2)] hover:border-indigo-500/30 transition-colors duration-500"
          >
            <h3 className="text-3xl font-bold text-white mb-8">Send a Message</h3>
            <form onSubmit={handleSubmit} className="space-y-6">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="relative group">
                  <input
                    type="text"
                    id="name"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    className="peer w-full h-14 bg-slate-900 border border-white/10 rounded-xl px-4 text-white placeholder-transparent focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all outline-none"
                    placeholder="John Doe"
                  />
                  <label htmlFor="name" className="absolute left-4 top-4 text-[#D6D6D6] text-sm transition-all peer-placeholder-shown:text-base peer-placeholder-shown:top-4 peer-placeholder-shown:text-slate-500 peer-focus:-top-2.5 peer-focus:left-3 peer-focus:text-xs peer-focus:text-indigo-500 peer-focus:bg-slate-900 peer-focus:px-1 peer-[&:not(:placeholder-shown)]:-top-2.5 peer-[&:not(:placeholder-shown)]:left-3 peer-[&:not(:placeholder-shown)]:text-xs peer-[&:not(:placeholder-shown)]:text-[#D6D6D6] peer-[&:not(:placeholder-shown)]:bg-slate-900 peer-[&:not(:placeholder-shown)]:px-1 pointer-events-none rounded-md">
                    Full Name
                  </label>
                </div>
                
                <div className="relative group">
                  <input
                    type="email"
                    id="email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    className="peer w-full h-14 bg-slate-900 border border-white/10 rounded-xl px-4 text-white placeholder-transparent focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all outline-none"
                    placeholder="john@example.com"
                  />
                  <label htmlFor="email" className="absolute left-4 top-4 text-[#D6D6D6] text-sm transition-all peer-placeholder-shown:text-base peer-placeholder-shown:top-4 peer-placeholder-shown:text-slate-500 peer-focus:-top-2.5 peer-focus:left-3 peer-focus:text-xs peer-focus:text-indigo-500 peer-focus:bg-slate-900 peer-focus:px-1 peer-[&:not(:placeholder-shown)]:-top-2.5 peer-[&:not(:placeholder-shown)]:left-3 peer-[&:not(:placeholder-shown)]:text-xs peer-[&:not(:placeholder-shown)]:text-[#D6D6D6] peer-[&:not(:placeholder-shown)]:bg-slate-900 peer-[&:not(:placeholder-shown)]:px-1 pointer-events-none rounded-md">
                    Email Address
                  </label>
                </div>
              </div>
              
              <div className="relative group">
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="peer w-full h-14 bg-slate-900 border border-white/10 rounded-xl px-4 text-white placeholder-transparent focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all outline-none"
                  placeholder="+91 98765 43210"
                />
                <label htmlFor="phone" className="absolute left-4 top-4 text-[#D6D6D6] text-sm transition-all peer-placeholder-shown:text-base peer-placeholder-shown:top-4 peer-placeholder-shown:text-slate-500 peer-focus:-top-2.5 peer-focus:left-3 peer-focus:text-xs peer-focus:text-indigo-500 peer-focus:bg-slate-900 peer-focus:px-1 peer-[&:not(:placeholder-shown)]:-top-2.5 peer-[&:not(:placeholder-shown)]:left-3 peer-[&:not(:placeholder-shown)]:text-xs peer-[&:not(:placeholder-shown)]:text-[#D6D6D6] peer-[&:not(:placeholder-shown)]:bg-slate-900 peer-[&:not(:placeholder-shown)]:px-1 pointer-events-none rounded-md">
                  Phone Number (Optional)
                </label>
              </div>
              
              <div className="relative group">
                <textarea
                  id="message"
                  name="message"
                  required
                  rows={5}
                  value={formData.message}
                  onChange={handleChange}
                  className="peer w-full bg-slate-900 border border-white/10 rounded-xl p-4 text-white placeholder-transparent focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all outline-none resize-none pt-6"
                  placeholder="Tell us about your project idea..."
                />
                <label htmlFor="message" className="absolute left-4 top-4 text-[#D6D6D6] text-sm transition-all peer-placeholder-shown:text-base peer-placeholder-shown:top-5 peer-placeholder-shown:text-slate-500 peer-focus:top-2 peer-focus:left-4 peer-focus:text-xs peer-focus:text-indigo-500 peer-[&:not(:placeholder-shown)]:top-2 peer-[&:not(:placeholder-shown)]:left-4 peer-[&:not(:placeholder-shown)]:text-xs peer-[&:not(:placeholder-shown)]:text-[#D6D6D6] pointer-events-none rounded-md">
                  Project Details
                </label>
              </div>
              
              <button 
                type="submit"
                disabled={isSubmitting}
                className="w-full h-16 bg-indigo-500 hover:bg-indigo-500/90 text-slate-950 rounded-xl font-black text-lg flex items-center justify-center gap-2 group shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:-translate-y-1 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
              >
                {isSubmitting ? "Sending Transmission..." : "Send Message"}
                {!isSubmitting && <Send className="w-6 h-6 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />}
              </button>
            </form>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
