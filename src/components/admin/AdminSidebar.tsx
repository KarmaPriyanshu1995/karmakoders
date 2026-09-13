"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  Settings,
  Layers,
  Image as ImageIcon,
  Users,
  LogOut,
  FileText,
  Briefcase,
  MessageSquare,
  Palette,
  Building,
  Menu,
  X,
  Activity,
  ChevronDown,
  Code2,
  BarChart3,
  Globe,
  Settings2,
  Shield,
  Sparkles,
  Tags,
  Handshake,
} from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import type { MembershipRole } from "@prisma/client";
import { canViewSection, type PermissionOverrides, type SectionKey } from "@/lib/permissions";

interface NavItem {
  href: string;
  label: string;
  icon: any;
  exact?: boolean;
  section?: SectionKey;
  children?: {
    href: string;
    label: string;
    icon: any;
    exact?: boolean;
  }[];
}

const navItems: NavItem[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/pages", label: "Pages & Sections", icon: Layers, section: "PAGES" },
  { href: "/admin/blog", label: "Blog Posts", icon: FileText, section: "BLOG" },
  { href: "/admin/projects", label: "Projects", icon: Briefcase, section: "PROJECTS" },
  { href: "/admin/careers", label: "Careers", icon: Building, section: "CAREERS" },
  { href: "/admin/inquiries", label: "Inquiries", icon: MessageSquare, section: "INQUIRIES" },
  { href: "/admin/media", label: "Media Library", icon: ImageIcon, section: "MEDIA" },
  {
    href: "/admin/tools",
    label: "Tools",
    icon: Sparkles,
    section: "TOOLS",
    children: [
      { href: "/admin/tools", label: "All Tools", icon: LayoutDashboard, exact: true },
      { href: "/admin/tools/new", label: "Add Tool", icon: Sparkles },
      { href: "/admin/tools/categories", label: "Categories", icon: Tags },
      { href: "/admin/tools/providers", label: "Providers", icon: Globe },
      { href: "/admin/tools/affiliates", label: "Affiliate Programs", icon: Handshake },
      { href: "/admin/tools/seo-pages", label: "SEO Pages", icon: FileText },
      { href: "/admin/tools/analytics", label: "Analytics", icon: BarChart3 },
    ],
  },
  { href: "/admin/users", label: "Users", icon: Users, section: "USERS" },
  { href: "/admin/appearance", label: "Appearance", icon: Palette, section: "SETTINGS" },
  {
    href: "/admin/seo",
    label: "SEO Intelligence",
    icon: Activity,
    section: "SEO",
    children: [
      { href: "/admin/seo", label: "SEO Dashboard", icon: LayoutDashboard, exact: true },
      { href: "/admin/seo/sitemap", label: "Site Crawl & Sitemap", icon: Globe },
      { href: "/admin/seo/search-console", label: "Search Console", icon: BarChart3 },
      { href: "/admin/seo/schema", label: "Schema", icon: Code2 },
      { href: "/admin/seo/settings", label: "Settings", icon: Settings2 },
    ],
  },
  { href: "/admin/settings", label: "Settings", icon: Settings, section: "SETTINGS" },
];

const platformNavItem: NavItem = {
  href: "/admin/platform/tenants",
  label: "Platform · Tenants",
  icon: Shield,
};

interface AdminSidebarProps {
  isSuperAdmin?: boolean;
  role?: MembershipRole | null;
  permissionOverrides?: PermissionOverrides | null;
}

export function AdminSidebar({ isSuperAdmin = false, role = null, permissionOverrides = null }: AdminSidebarProps) {
  const pathname = usePathname();
  const visibleItems = isSuperAdmin
    ? navItems
    : navItems.filter((item) => !item.section || (role && canViewSection(role, item.section, permissionOverrides)));
  const items = isSuperAdmin ? [...visibleItems, platformNavItem] : visibleItems;
  const [isOpen, setIsOpen] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});

  // Auto-expand parent items when on a sub-route
  useEffect(() => {
    const initialExpanded: Record<string, boolean> = {};
    items.forEach((item) => {
      if (item.children && pathname.startsWith(item.href)) {
        initialExpanded[item.href] = true;
      }
    });
    setExpandedItems((prev) => ({ ...prev, ...initialExpanded }));
  }, [pathname]);

  const isActive = (item: { href: string; exact?: boolean }) =>
    item.exact ? pathname === item.href : pathname.startsWith(item.href);

  return (
    <>
      {/* Mobile Floating Action Hamburger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 p-3.5 bg-[#FFC300] text-[#1C1B1A] rounded-full shadow-[0_0_20px_rgba(255,195,0,0.4)] md:hidden transition-all flex items-center justify-center hover:scale-105 active:scale-95"
        aria-label="Toggle Sidebar"
      >
        {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Backdrop overlay for mobile drawer */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 z-40 bg-[#1C1B1A]/80 backdrop-blur-sm md:hidden animate-in fade-in duration-200"
        />
      )}

      {/* Sidebar container */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 border-r border-white/5 bg-[#1C1B1A] flex-col flex transition-transform duration-300 md:static md:translate-x-0 md:bg-[#1C1B1A]/50 md:backdrop-blur-xl md:h-screen md:sticky md:top-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="h-16 flex items-center px-6 border-b border-white/5 flex-shrink-0">
          <span className="text-xl font-black text-white tracking-tight">
            karmakoders<span className="text-[#FFC300]">.admin</span>
          </span>
        </div>
        <nav className="flex-1 py-6 px-4 space-y-1.5 overflow-y-auto">
          {items.map((item) => {
            const hasChildren = !!item.children;
            const isExpanded = !!expandedItems[item.href];
            
            const isExactActive = pathname === item.href;
            const isChildActive = hasChildren && pathname.startsWith(item.href) && !isExactActive;
            
            const parentHighlight = isExactActive
              ? "bg-[#FFC300]/10 text-[#FFC300] border-[#FFC300]/20 shadow-[0_0_15px_rgba(255,195,0,0.05)]"
              : isChildActive
                ? "text-white bg-white/5 border-white/10"
                : "text-[#D6D6D6] border-transparent hover:text-white hover:bg-white/5 hover:border-white/10";

            const parentIconColor = (isExactActive || isChildActive)
              ? "text-[#FFC300]"
              : "text-slate-400 group-hover:text-white";

            return (
              <div key={item.href} className="space-y-1">
                {hasChildren ? (
                  <div
                    className={cn(
                      "flex items-center justify-between rounded-xl font-bold transition-all duration-300 border group",
                      parentHighlight
                    )}
                  >
                    <Link
                      href={item.href}
                      onClick={() => {
                        setIsOpen(false);
                        setExpandedItems((prev) => ({ ...prev, [item.href]: true }));
                      }}
                      className="flex-1 flex items-center px-4 py-3"
                    >
                      <item.icon className={cn("w-5 h-5 mr-3 flex-shrink-0 transition-colors", parentIconColor)} />
                      {item.label}
                    </Link>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setExpandedItems((prev) => ({ ...prev, [item.href]: !prev[item.href] }));
                      }}
                      className="px-4 py-3.5 text-slate-400 hover:text-white transition-all flex items-center justify-center rounded-r-xl hover:bg-white/5"
                      aria-label={isExpanded ? "Collapse section" : "Expand section"}
                    >
                      <ChevronDown className={cn("w-4 h-4 transition-transform duration-300", isExpanded && "rotate-180")} />
                    </button>
                  </div>
                ) : (
                  <Link
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className={cn(
                      "flex items-center px-4 py-3 rounded-xl font-bold transition-all duration-300 border group",
                      parentHighlight
                    )}
                  >
                    <item.icon className={cn("w-5 h-5 mr-3 flex-shrink-0 transition-colors", parentIconColor)} />
                    {item.label}
                    {isExactActive && (
                      <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#FFC300] shadow-[0_0_5px_#FFC300]" />
                    )}
                  </Link>
                )}

                {hasChildren && isExpanded && item.children && (
                  <div className="pl-6 space-y-1 mt-1 border-l border-white/5 ml-6 animate-in slide-in-from-top-1 duration-200">
                    {item.children.map((child) => {
                      const childActive = isActive(child);
                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          onClick={() => setIsOpen(false)}
                          className={cn(
                            "flex items-center px-4 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 border group",
                            childActive
                              ? "text-[#FFC300] bg-[#FFC300]/10 border-[#FFC300]/20"
                              : "text-slate-400 border-transparent hover:text-white hover:bg-white/5"
                          )}
                        >
                          <child.icon className={cn(
                            "w-4 h-4 mr-2.5 flex-shrink-0 transition-colors",
                            childActive ? "text-[#FFC300]" : "text-slate-500 group-hover:text-white"
                          )} />
                          <span className="truncate">{child.label}</span>
                          {childActive && (
                            <span className="ml-auto w-1 h-1 rounded-full bg-[#FFC300] shadow-[0_0_4px_#FFC300]" />
                          )}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
        <div className="p-4 border-t border-white/5 flex-shrink-0">
          <button
            onClick={() => signOut({ callbackUrl: "/admin/login" })}
            className="flex w-full items-center px-4 py-3 text-[#D6D6D6] hover:text-white hover:bg-rose-500/10 hover:border-rose-500/20 border border-transparent rounded-xl font-bold transition-all group"
          >
            <LogOut className="w-5 h-5 mr-3 text-slate-400 group-hover:text-rose-400 transition-colors" /> Sign Out
          </button>
        </div>
      </aside>
    </>
  );
}
