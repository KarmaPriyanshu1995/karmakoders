"use client";

import { motion } from "framer-motion";
import { Calendar, User, ArrowRight } from "lucide-react";
import Link from "next/link";

const defaultPosts: PostData[] = [
  {
    title: "The Future of Web Design in an AI-Driven World",
    slug: "future-of-web-design",
    category: "Design",
    date: "May 12, 2026",
    author: "Maya Patel",
    image: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=800",
  },
  {
    title: "Scaling Modern Applications with Next.js 16",
    slug: "scaling-modern-applications",
    category: "Development",
    date: "May 08, 2026",
    author: "Leo Zhang",
    image: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&q=80&w=800",
  },
  {
    title: "How to Leverage 3D Experiences for User Engagement",
    slug: "leverage-3d-experiences",
    category: "Creative",
    date: "May 05, 2026",
    author: "Alex Rivera",
    image: "https://images.unsplash.com/photo-1633356122544-f134324a6cee?auto=format&fit=crop&q=80&w=800",
  },
];

interface PostData {
  title: string;
  slug?: string | null;
  category?: string | null;
  date?: string | null;
  author?: string | null;
  image?: string | null;
  createdAt?: Date | string;
}

interface BlogProps {
  tagline?: string;
  heading?: string;
  posts?: PostData[];
  showViewAll?: boolean;
}

export function BlogSection({
  tagline = "Our Blog",
  heading = "Latest Insights & Digital Trends",
  posts = defaultPosts,
  showViewAll = true,
}: BlogProps) {
  return (
    <section id="blog" className="py-32 px-8 md:px-24 bg-slate-950">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-20 gap-8">
          <div className="max-w-2xl">
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
              className="mt-4 text-4xl md:text-5xl font-bold text-white"
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
              <Link href="/blog" className="px-8 py-4 border border-slate-800 hover:border-indigo-500 text-white font-bold rounded-full transition-all group">
                View All Posts
              </Link>
            </motion.div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {posts.map((post, i) => (
            <motion.div
              key={post.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="group cursor-pointer"
            >
              <Link href={`/blog/${post.slug}`}>
                <div className="relative rounded-3xl overflow-hidden aspect-[16/10] mb-8">
                  <img
                    src={post.image || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=800"}
                    alt={post.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute top-4 left-4 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-white text-xs font-bold border border-white/20">
                    {post.category || "Design"}
                  </div>
                </div>
                
                <div className="flex items-center gap-6 mb-4 text-slate-500 text-sm">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span suppressHydrationWarning>
                      {post.date || (post.createdAt ? new Date(post.createdAt).toLocaleDateString(undefined, { 
                        year: 'numeric', 
                        month: '2-digit', 
                        day: '2-digit' 
                      }) : "Recently")}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    {post.author || "karmakoders Team"}
                  </div>
                </div>
                
                <h3 className="text-2xl font-bold text-white mb-6 group-hover:text-indigo-400 transition-colors line-clamp-2 leading-tight">
                  {post.title}
                </h3>
                
                <div className="inline-flex items-center text-white font-bold group-hover:gap-4 transition-all gap-2">
                  Read Article <ArrowRight className="w-5 h-5 text-indigo-500" />
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
