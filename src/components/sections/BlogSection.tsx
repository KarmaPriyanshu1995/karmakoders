"use client";

import { motion } from "framer-motion";
import { Calendar, User, ArrowRight } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

import { DEFAULT_POSTS, type PostData } from "@/lib/constants";

interface BlogProps {
  tagline?: string;
  heading?: string;
  posts?: PostData[];
  showViewAll?: boolean;
}

export function BlogSection({
  tagline = "Our Blog",
  heading = "Latest Insights & Digital Trends",
  posts = DEFAULT_POSTS,
  showViewAll = true,
}: BlogProps) {
  return (
    <section id="blog" aria-label="Latest blog posts" className="py-20 sm:py-32 px-4 sm:px-6 md:px-12 bg-slate-950 relative overflow-hidden">
      {/* Background glowing orb */}
      <div className="absolute top-1/2 left-0 w-[600px] h-[600px] bg-indigo-500 opacity-[0.02] blur-[150px] rounded-full pointer-events-none transform -translate-y-1/2 -translate-x-1/4" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-indigo-500 opacity-[0.015] blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="flex flex-col md:flex-row md:items-end items-center justify-between mb-20 gap-8">
          <div className="text-center max-w-2xl">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 backdrop-blur-xl border border-white/10 text-indigo-500 text-sm font-bold tracking-widest uppercase shadow-indigo-500/10 shadow-[0_0_15px_rgba(99,102,241,0.1)] mb-6"
            >
              {tagline}
            </motion.div>
            <motion.h2
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-5xl md:text-6xl font-black text-white tracking-tight"
            >
              {heading}
            </motion.h2>
          </div>
          {showViewAll && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
            >
              <Link href="/blog" className="px-8 py-4 bg-white/5 backdrop-blur-xl border border-white/10 hover:border-indigo-500/50 hover:bg-white/10 text-white font-bold rounded-xl transition-all flex items-center justify-center shadow-indigo-500/5 hover:shadow-indigo-500/20">
                View All Posts
              </Link>
            </motion.div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {posts.map((post, i) => (
            <motion.div
              key={post.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              className="group cursor-pointer p-5 rounded-[2.5rem] bg-white/5 border border-white/10 hover:border-indigo-500/30 hover:bg-white/10 transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_20px_40px_rgba(0,0,0,0.4)]"
            >
              <Link href={`/blog/${post.slug || '#'}`}>
                <div className="relative rounded-[2rem] overflow-hidden aspect-[16/10] mb-8">
                  <Image
                    src={post.image || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=800"}
                    alt={post.title}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 to-transparent opacity-60" />
                  <div className="absolute top-4 left-4 px-4 py-1.5 bg-indigo-500 rounded-xl text-slate-950 text-xs font-bold uppercase tracking-widest shadow-[0_0_15px_rgba(99,102,241,0.4)]">
                    {post.category || "Design"}
                  </div>
                </div>
                
                <div className="px-3 pb-3">
                  <div className="flex items-center gap-6 mb-5 text-[#D6D6D6] text-sm font-medium">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-indigo-500" />
                      <span suppressHydrationWarning>
                        {post.date || (post.createdAt ? new Date(post.createdAt).toLocaleDateString(undefined, { 
                          year: 'numeric', 
                          month: 'short', 
                          day: 'numeric' 
                        }) : "Recently")}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-indigo-500" />
                      {post.author || "karmakoders"}
                    </div>
                  </div>
                  
                  <h3 className="text-2xl font-bold text-white mb-6 group-hover:text-indigo-400 transition-colors duration-300 line-clamp-2 leading-tight">
                    {post.title}
                  </h3>
                  
                  <div className="inline-flex items-center text-white font-bold group-hover:text-indigo-400 transition-colors gap-2 text-sm uppercase tracking-widest">
                    Read Article <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform duration-300" />
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
