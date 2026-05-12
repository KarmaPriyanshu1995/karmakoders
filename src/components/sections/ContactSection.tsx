"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Mail, Phone, MapPin, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { submitContact } from "@/lib/actions";
import { toast } from "sonner";

interface ContactProps {
  tagline?: string;
  heading?: string;
  description?: string;
}

export function ContactSection({
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
    <section id="contact" className="py-32 px-8 md:px-24 bg-slate-950">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-20">
          <div>
            <motion.span
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="text-indigo-400 text-sm font-semibold uppercase tracking-widest"
            >
              {tagline}
            </motion.span>
            <motion.h2
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="mt-4 text-4xl md:text-5xl font-bold text-white leading-tight"
            >
              {heading}
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="mt-6 text-slate-400 text-lg leading-relaxed max-w-lg"
            >
              {description}
            </motion.p>
            
            <div className="mt-12 space-y-8">
              <div className="flex items-start gap-6">
                <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-indigo-400 shrink-0">
                  <Mail className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-white font-bold mb-1">Email Us</h4>
                  <p className="text-slate-400">karmakoders@gmail.com</p>
                </div>
              </div>
              
              <div className="flex items-start gap-6">
                <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-indigo-400 shrink-0">
                  <Phone className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-white font-bold mb-1">Call Us</h4>
                  <p className="text-slate-400">7627056875</p>
                </div>
              </div>
              
              <div className="flex items-start gap-6">
                <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-indigo-400 shrink-0">
                  <MapPin className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-white font-bold mb-1">Visit Us</h4>
                  <p className="text-slate-400">JLN marg malvinagar</p>
                </div>
              </div>
            </div>
          </div>
          
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="p-10 rounded-[32px] bg-slate-900/40 border border-slate-800 backdrop-blur-sm"
          >
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300 ml-1">Full Name</label>
                  <input
                    type="text"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="John Doe"
                    className="w-full h-12 bg-slate-950 border border-slate-800 rounded-xl px-4 text-white focus:border-indigo-500 transition-colors outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300 ml-1">Email Address</label>
                  <input
                    type="email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="john@example.com"
                    className="w-full h-12 bg-slate-950 border border-slate-800 rounded-xl px-4 text-white focus:border-indigo-500 transition-colors outline-none"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300 ml-1">Phone Number (Optional)</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="+91 98765 43210"
                  className="w-full h-12 bg-slate-950 border border-slate-800 rounded-xl px-4 text-white focus:border-indigo-500 transition-colors outline-none"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300 ml-1">Project Details</label>
                <textarea
                  name="message"
                  required
                  rows={5}
                  value={formData.message}
                  onChange={handleChange}
                  placeholder="Tell us about your project idea..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white focus:border-indigo-500 transition-colors outline-none resize-none"
                />
              </div>
              
              <Button 
                type="submit"
                disabled={isSubmitting}
                className="w-full h-14 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 group shadow-[0_10px_30px_rgba(79,70,229,0.3)] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? "Sending..." : "Send Message"}
                {!isSubmitting && <Send className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />}
              </Button>
            </form>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
