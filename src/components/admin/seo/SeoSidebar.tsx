"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Search,
  Building2,
  FileText,
  Map,
  Link2,
  Code2,
  Wrench,
  BarChart3,
  TrendingUp,
  MousePointerClick,
  PieChart,
  Users,
  Star,
  Bot,
  Zap,
  Settings2,
  ChevronLeft,
  ChevronRight,
  Activity,
} from "lucide-react";

const seoNav = [
  { href: "/admin/seo", label: "SEO Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/seo/analyzer", label: "Page Analyzer", icon: Search },
  { href: "/admin/seo/entities", label: "Entity Center", icon: Building2 },
  { href: "/admin/seo/content", label: "Content Intelligence", icon: FileText },
  { href: "/admin/seo/authority", label: "Topical Authority", icon: Map },
  { href: "/admin/seo/internal-links", label: "Internal Links", icon: Link2 },
  { href: "/admin/seo/schema", label: "Schema Center", icon: Code2 },
  { href: "/admin/seo/technical", label: "Technical SEO", icon: Wrench },
  { href: "/admin/seo/search-console", label: "Search Console", icon: BarChart3 },
  { href: "/admin/seo/keywords", label: "Keyword Opportunities", icon: TrendingUp },
  { href: "/admin/seo/ctr", label: "CTR Optimization", icon: MousePointerClick },
  { href: "/admin/seo/content-gap", label: "Content Gap", icon: PieChart },
  { href: "/admin/seo/competitors", label: "Competitor Intel", icon: Users },
  { href: "/admin/seo/brand", label: "Brand Authority", icon: Star },
  { href: "/admin/seo/ai-assistant", label: "AI SEO Assistant", icon: Bot },
  { href: "/admin/seo/automation", label: "SEO Automation", icon: Zap },
  { href: "/admin/seo/settings", label: "Settings", icon: Settings2 },
];

export function SeoSidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const isActive = (item: { href: string; exact?: boolean }) =>
    item.exact ? pathname === item.href : pathname.startsWith(item.href);

  return (
    <aside
      className={cn(
        "flex flex-col border-r border-white/5 bg-[#181716] transition-all duration-300 flex-shrink-0",
        collapsed ? "w-16" : "w-56"
      )}
      style={{ minHeight: "calc(100vh - 4rem)" }}
    >
      {/* Header */}
      <div className={cn("flex items-center border-b border-white/5 py-4 px-3 gap-2", collapsed ? "justify-center" : "justify-between")}>
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-[#FFC300] flex items-center justify-center">
              <Activity className="w-3.5 h-3.5 text-[#1C1B1A]" />
            </div>
            <span className="text-xs font-black text-white uppercase tracking-widest">SEO Center</span>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all"
        >
          {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Nav items */}
      <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
        {seoNav.map((item) => {
          const active = isActive(item);
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={cn(
                "flex items-center rounded-xl font-semibold transition-all duration-200 group",
                collapsed ? "w-10 h-10 justify-center mx-auto" : "px-3 py-2.5 gap-3",
                active
                  ? "bg-[#FFC300]/10 text-[#FFC300] border border-[#FFC300]/20"
                  : "text-slate-400 border border-transparent hover:text-white hover:bg-white/5 hover:border-white/10"
              )}
            >
              <item.icon
                className={cn(
                  "flex-shrink-0 transition-colors",
                  collapsed ? "w-4 h-4" : "w-4 h-4",
                  active ? "text-[#FFC300]" : "text-slate-500 group-hover:text-white"
                )}
              />
              {!collapsed && (
                <span className="text-xs truncate">{item.label}</span>
              )}
              {!collapsed && active && (
                <span className="ml-auto w-1 h-1 rounded-full bg-[#FFC300] shadow-[0_0_4px_#FFC300]" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Back to admin link */}
      <div className={cn("p-2 border-t border-white/5", collapsed ? "flex justify-center" : "")}>
        <Link
          href="/admin"
          title={collapsed ? "Back to Admin" : undefined}
          className={cn(
            "flex items-center text-slate-500 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/10 rounded-xl transition-all text-xs font-semibold group",
            collapsed ? "w-10 h-10 justify-center" : "px-3 py-2.5 gap-2 w-full"
          )}
        >
          <ChevronLeft className="w-4 h-4 flex-shrink-0 group-hover:text-[#FFC300] transition-colors" />
          {!collapsed && <span>Back to Admin</span>}
        </Link>
      </div>
    </aside>
  );
}
