"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Globe, Search, Sparkles, Wrench } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  Globe,
  Search,
  Sparkles,
  Wrench,
};

export interface CatalogTool {
  id: string;
  name: string;
  slug: string;
  shortDescription: string;
  icon: string | null;
  isFeatured: boolean;
  toolUrl: string | null;
  category: { name: string; slug: string } | null;
  seoKeywords: string | null;
}

export function FreeToolsCatalog({
  tools,
  categories,
}: {
  tools: CatalogTool[];
  categories: { name: string; slug: string }[];
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tools.filter((tool) => {
      if (category !== "all" && tool.category?.slug !== category) return false;
      if (!q) return true;
      const haystack = [tool.name, tool.shortDescription, tool.category?.name, tool.seoKeywords]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [tools, query, category]);

  return (
    <div>
      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <label className="relative flex-1">
          <span className="sr-only">Search tools</span>
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, category, or keyword"
            className="w-full pl-11 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500/50"
          />
        </label>
      </div>

      <div className="flex flex-wrap gap-2 mb-10">
        <button
          type="button"
          onClick={() => setCategory("all")}
          className={`px-4 py-2 rounded-full text-sm font-semibold border transition-colors ${
            category === "all"
              ? "bg-indigo-500 text-slate-950 border-indigo-500"
              : "border-white/10 text-slate-300 hover:border-white/20"
          }`}
        >
          All
        </button>
        {categories.map((item) => (
          <button
            key={item.slug}
            type="button"
            onClick={() => setCategory(item.slug)}
            className={`px-4 py-2 rounded-full text-sm font-semibold border transition-colors ${
              category === item.slug
                ? "bg-indigo-500 text-slate-950 border-indigo-500"
                : "border-white/10 text-slate-300 hover:border-white/20"
            }`}
          >
            {item.name}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="text-slate-400 text-center py-16">No tools match that search yet.</p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((tool) => {
            const Icon = ICONS[tool.icon || ""] || Globe;
            const href = tool.toolUrl || `/free-tools/${tool.slug}`;
            return (
              <Link
                key={tool.id}
                href={href}
                className="group rounded-2xl border border-white/10 bg-white/[0.03] p-6 hover:border-indigo-500/40 hover:bg-indigo-500/5 transition-colors flex flex-col"
              >
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="w-11 h-11 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                    <Icon className="w-5 h-5" />
                  </div>
                  {tool.isFeatured && (
                    <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-full bg-indigo-500/15 text-indigo-400 border border-indigo-500/20">
                      Featured
                    </span>
                  )}
                </div>
                <h2 className="text-xl font-bold text-white mb-2">{tool.name}</h2>
                {tool.category && (
                  <p className="text-xs uppercase tracking-widest text-slate-500 mb-3">{tool.category.name}</p>
                )}
                <p className="text-slate-400 text-sm leading-relaxed flex-1">{tool.shortDescription}</p>
                <span className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-indigo-400">
                  Use Tool
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
