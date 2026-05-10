"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
} from "lucide-react";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/pages", label: "Pages & Sections", icon: Layers },
  { href: "/admin/blog", label: "Blog Posts", icon: FileText },
  { href: "/admin/projects", label: "Projects", icon: Briefcase },
  { href: "/admin/inquiries", label: "Inquiries", icon: MessageSquare },
  { href: "/admin/media", label: "Media Library", icon: ImageIcon },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export function AdminSidebar() {
  const pathname = usePathname();

  const isActive = (item: { href: string; exact?: boolean }) =>
    item.exact ? pathname === item.href : pathname.startsWith(item.href);

  return (
    <aside className="w-64 border-r border-slate-800 bg-slate-900/50 backdrop-blur flex-col hidden md:flex">
      <div className="h-16 flex items-center px-6 border-b border-slate-800">
        <span className="text-xl font-bold text-white">
          karmakoders<span className="text-indigo-400">.admin</span>
        </span>
      </div>
      <nav className="flex-1 py-6 px-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const active = isActive(item);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center px-3 py-2.5 rounded-lg font-medium transition-colors ${
                active
                  ? "bg-indigo-500/15 text-indigo-300 border border-indigo-500/30"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/50"
              }`}
            >
              <item.icon className="w-5 h-5 mr-3 flex-shrink-0" />
              {item.label}
              {active && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-400" />
              )}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-slate-800">
        <button
          onClick={() => signOut({ callbackUrl: "/admin/login" })}
          className="flex w-full items-center px-3 py-2.5 text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-lg font-medium transition-colors"
        >
          <LogOut className="w-5 h-5 mr-3" /> Sign Out
        </button>
      </div>
    </aside>
  );
}
