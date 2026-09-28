"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import { Calendar, User, ArrowRight, ChevronLeft, ChevronRight, Eye } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=800";

export type ListingCardItem = {
  id?: string;
  href: string;
  title: string;
  image?: string | null;
  imageAlt?: string;
  category?: string | null;
  date?: string | Date | null;
  author?: string | null;
  viewCount?: number | null;
  badge?: string | null;
};

export type ListingCardGridProps = {
  id?: string;
  ariaLabel: string;
  tagline: string;
  heading: string;
  description?: string;
  isFirstSection?: boolean;
  items: ListingCardItem[];
  showViewAll?: boolean;
  viewAllHref?: string;
  viewAllLabel?: string;
  emptyMessage?: ReactNode;
  ctaLabel?: string;
  itemsPerPage?: number;
  fallbackNotice?: ReactNode;
  headerExtra?: ReactNode;
};

function formatCardDate(value?: string | Date | null) {
  if (!value) return "Recently";
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Recently";
  return parsed.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function ListingCardGrid({
  id,
  ariaLabel,
  tagline,
  heading,
  description,
  isFirstSection = false,
  items,
  showViewAll = false,
  viewAllHref = "/blog",
  viewAllLabel = "View All Posts",
  emptyMessage = "No posts published yet.",
  ctaLabel = "Read Article",
  itemsPerPage = 9,
  fallbackNotice,
  headerExtra,
}: ListingCardGridProps) {
  const perPage = itemsPerPage ?? 9;
  const [currentPage, setCurrentPage] = useState(1);
  const sectionRef = useRef<HTMLDivElement>(null);
  const totalPages = Math.max(1, Math.ceil(items.length / perPage));

  useEffect(() => {
    setCurrentPage(1);
  }, [items.length]);

  const startIndex = (currentPage - 1) * perPage;
  const paginatedItems = items.slice(startIndex, startIndex + perPage);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    if (sectionRef.current) {
      sectionRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const HeadingTag = isFirstSection ? motion.h1 : motion.h2;

  return (
    <section
      ref={sectionRef}
      id={id}
      aria-label={ariaLabel}
      className="pt-28 sm:pt-32 pb-20 sm:pb-32 px-4 sm:px-6 md:px-12 bg-slate-950 relative overflow-hidden"
    >
      <div className="absolute top-1/2 left-0 w-[600px] h-[600px] bg-indigo-500 opacity-[0.02] blur-[150px] rounded-full pointer-events-none transform -translate-y-1/2 -translate-x-1/4" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-indigo-500 opacity-[0.015] blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="flex flex-col md:flex-row md:items-end items-center justify-between mb-20 gap-8">
          <div className="text-center w-full">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 backdrop-blur-xl border border-white/10 text-indigo-500 text-sm font-bold tracking-widest uppercase shadow-indigo-500/10 shadow-[0_0_15px_rgba(99,102,241,0.1)] mb-6"
            >
              {tagline}
            </motion.div>
            <HeadingTag
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-5xl md:text-6xl font-black text-white tracking-tight"
            >
              {heading}
            </HeadingTag>
            {description ? (
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.15 }}
                className="mt-6 text-lg text-slate-400 leading-relaxed max-w-3xl mx-auto"
              >
                {description}
              </motion.p>
            ) : null}
            {headerExtra}
          </div>
          {showViewAll && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
            >
              <Link
                href={viewAllHref}
                className="px-8 py-4 bg-white/5 backdrop-blur-xl border border-white/10 hover:border-indigo-500/50 hover:bg-white/10 text-white font-bold rounded-xl transition-all flex items-center justify-center shadow-indigo-500/5 hover:shadow-indigo-500/20 whitespace-nowrap"
              >
                {viewAllLabel}
              </Link>
            </motion.div>
          )}
        </div>

        {fallbackNotice ? <div className="mb-10">{fallbackNotice}</div> : null}

        {items.length === 0 ? (
          <div className="text-center text-slate-400 text-lg">{emptyMessage}</div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {paginatedItems.map((item, i) => (
                <motion.div
                  key={item.id || item.href || item.title}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: (i % perPage) * 0.1, duration: 0.5 }}
                  className="group cursor-pointer p-5 rounded-[2.5rem] bg-white/5 border border-white/10 hover:border-indigo-500/30 hover:bg-white/10 transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_20px_40px_rgba(0,0,0,0.4)]"
                >
                  <Link href={item.href}>
                    <div className="relative rounded-[2rem] overflow-hidden aspect-[16/10] mb-8">
                      <Image
                        src={item.image || FALLBACK_IMAGE}
                        alt={item.imageAlt || item.title}
                        fill
                        sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        className="object-cover transition-transform duration-700 group-hover:scale-105"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 to-transparent opacity-60" />
                      <div className="absolute top-4 left-4 px-4 py-1.5 bg-indigo-500 rounded-xl text-slate-950 text-xs font-bold uppercase tracking-widest shadow-[0_0_15px_rgba(99,102,241,0.4)]">
                        {item.category || "Design"}
                      </div>
                      {item.badge ? (
                        <span className="absolute top-4 right-4 px-2.5 py-1 bg-slate-950/70 backdrop-blur-sm border border-white/20 text-white/70 text-[10px] font-bold uppercase tracking-wider rounded-md">
                          {item.badge}
                        </span>
                      ) : null}
                    </div>

                    <div className="px-3 pb-3">
                      <div className="flex items-center gap-6 mb-5 text-[#D6D6D6] text-sm font-medium">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-indigo-500" />
                          <span suppressHydrationWarning>{formatCardDate(item.date)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-indigo-500" />
                          {item.author || "karmakoders"}
                        </div>
                        <div className="flex items-center gap-2">
                          <Eye className="w-4 h-4 text-indigo-500" />
                          {(item.viewCount ?? 0).toLocaleString()}
                        </div>
                      </div>

                      <h3 className="text-2xl font-bold text-white mb-6 group-hover:text-indigo-400 transition-colors duration-300 line-clamp-2 leading-tight">
                        {item.title}
                      </h3>

                      <div className="inline-flex items-center text-white font-bold group-hover:text-indigo-400 transition-colors gap-2 text-sm uppercase tracking-widest">
                        {ctaLabel}{" "}
                        <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform duration-300" />
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-16">
                <button
                  onClick={() => handlePageChange(Math.max(currentPage - 1, 1))}
                  disabled={currentPage === 1}
                  className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-indigo-500 hover:text-slate-950 hover:border-indigo-500 disabled:opacity-30 disabled:hover:bg-white/5 disabled:hover:text-white disabled:hover:border-white/10 hover:shadow-indigo-500/20 active:scale-95 transition-all duration-300 disabled:pointer-events-none cursor-pointer"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>

                {Array.from({ length: totalPages }, (_, idx) => {
                  const pageNum = idx + 1;
                  return (
                    <button
                      key={pageNum}
                      onClick={() => handlePageChange(pageNum)}
                      className={`w-12 h-12 rounded-xl border flex items-center justify-center font-bold transition-all duration-300 active:scale-95 cursor-pointer ${
                        currentPage === pageNum
                          ? "bg-indigo-500 text-slate-950 border-indigo-500 shadow-indigo-500/30 shadow-[0_0_15px_rgba(99,102,241,0.4)]"
                          : "bg-white/5 border-white/10 text-white hover:bg-white/10 hover:border-white/20"
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}

                <button
                  onClick={() => handlePageChange(Math.min(currentPage + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-indigo-500 hover:text-slate-950 hover:border-indigo-500 disabled:opacity-30 disabled:hover:bg-white/5 disabled:hover:text-white disabled:hover:border-white/10 hover:shadow-indigo-500/20 active:scale-95 transition-all duration-300 disabled:pointer-events-none cursor-pointer"
                  aria-label="Next page"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
