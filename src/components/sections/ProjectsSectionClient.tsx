"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { DEMO_PROJECT_SLUGS } from "@/lib/caseStudyDetails";
import { ListingCardGrid } from "@/components/content/ListingCardGrid";

export interface ProjectLike {
  id?: string;
  title: string;
  slug: string;
  category?: string;
  description?: string;
  content?: string;
  imageUrl?: string;
  image?: string;
  tags?: string;
  detailsJson?: string | null;
  createdAt?: string | Date | null;
}

interface ProjectsSectionClientProps {
  isCentered?: boolean;
  tagline?: string;
  heading?: string;
  subheading?: string;
  capabilities?: string[];
  projects: ProjectLike[];
  isFallback?: boolean;
  limit?: number;
  showViewAll?: boolean;
  isFirstSection?: boolean;
}

const DEFAULT_CAPABILITIES = ["AI", "SAAS", "WEB", "MOBILE"];

export function ProjectsSectionClient({
  tagline = "Case Studies",
  heading = "Real Results for Real Businesses",
  subheading,
  capabilities,
  projects,
  isFallback = false,
  limit = 6,
  showViewAll = true,
  isFirstSection = false,
}: ProjectsSectionClientProps) {
  const [categoryParam, setCategoryParam] = useState<string | null>(null);

  useEffect(() => {
    const category = new URLSearchParams(window.location.search).get("category");
    setCategoryParam(category);
  }, []);

  const chips = capabilities && capabilities.length > 0 ? capabilities : DEFAULT_CAPABILITIES;
  const filteredProjects = categoryParam
    ? projects.filter((p) => p.category?.toLowerCase() === categoryParam.toLowerCase())
    : projects;
  const numericLimit = Number(limit) || 0;
  const displayProjects =
    (isFirstSection && !showViewAll) || numericLimit <= 0
      ? filteredProjects
      : filteredProjects.slice(0, numericLimit);
  const showFilters = isFirstSection;

  return (
    <ListingCardGrid
      id="portfolio"
      ariaLabel="Selected projects"
      tagline={tagline}
      heading={heading}
      description={subheading}
      isFirstSection={isFirstSection}
      items={displayProjects.map((project) => {
        const isDemoProject = isFallback || DEMO_PROJECT_SLUGS.has(project.slug);
        return {
          id: project.id || project.slug,
          href: `/portfolio/${project.slug || "#"}`,
          title: project.title,
          image: project.imageUrl || project.image,
          category: project.category || "Case Study",
          date: project.createdAt,
          viewCount: 0,
          badge: isDemoProject ? "Concept" : null,
        };
      })}
      showViewAll={showViewAll}
      viewAllHref="/portfolio"
      viewAllLabel="View All Cases"
      emptyMessage="No projects published yet."
      ctaLabel="Read Article"
      fallbackNotice={
        isFallback ? (
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-500/5 border border-indigo-500/20 text-slate-400 text-xs font-medium">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            Showing concept examples while live project data loads.
          </div>
        ) : null
      }
      headerExtra={
        showFilters ? (
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="mt-8 flex flex-wrap gap-2 justify-center"
          >
            <button
              type="button"
              onClick={() => setCategoryParam(null)}
              className={cn(
                "px-3 py-1.5 rounded-lg border text-xs font-bold tracking-widest uppercase transition-colors",
                !categoryParam
                  ? "bg-indigo-500 border-indigo-500 text-slate-950"
                  : "bg-white/5 border-white/10 text-slate-300 hover:border-white/20",
              )}
            >
              All
            </button>
            {chips.map((chip) => {
              const active = categoryParam?.toLowerCase() === chip.toLowerCase();
              return (
                <button
                  key={chip}
                  type="button"
                  onClick={() => setCategoryParam(chip)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg border text-xs font-bold tracking-widest uppercase transition-colors",
                    active
                      ? "bg-indigo-500 border-indigo-500 text-slate-950"
                      : "bg-white/5 border-white/10 text-slate-300 hover:border-white/20",
                  )}
                >
                  {chip}
                </button>
              );
            })}
          </motion.div>
        ) : null
      }
    />
  );
}
