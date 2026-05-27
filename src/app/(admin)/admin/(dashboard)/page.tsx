import { getContactSubmissions } from "@/lib/actions";
import { MessageSquare, Eye, MousePointerClick, Users, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const submissions = await getContactSubmissions();
  const recent = submissions.slice(0, 5);

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="p-6 rounded-[2rem] bg-white/5 backdrop-blur-xl border border-white/10 hover:border-[#FFC300]/30 transition-all duration-300 hover:-translate-y-1 shadow-[0_0_20px_rgba(0,0,0,0.1)] group">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-[#D6D6D6] uppercase tracking-wider">Total Inquiries</h3>
            <div className="w-10 h-10 rounded-xl bg-[#FFC300]/10 flex items-center justify-center text-[#FFC300] border border-[#FFC300]/20 group-hover:bg-[#FFC300]/20 transition-colors">
              <MessageSquare className="w-5 h-5" />
            </div>
          </div>
          <p className="text-4xl font-black text-white group-hover:text-[#FFC300] transition-colors">{submissions.length}</p>
          <Link href="/admin/inquiries" className="mt-4 text-xs font-bold text-[#FFC300] uppercase tracking-widest hover:text-white transition-colors flex items-center gap-1">
            View all <ArrowUpRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="p-6 rounded-[2rem] bg-white/5 backdrop-blur-xl border border-white/10 hover:border-white/20 transition-all duration-300 hover:-translate-y-1 shadow-[0_0_20px_rgba(0,0,0,0.1)]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-[#D6D6D6] uppercase tracking-wider">Page Views</h3>
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-400 border border-cyan-500/20">
              <Eye className="w-5 h-5" />
            </div>
          </div>
          <p className="text-4xl font-black text-white">—</p>
          <p className="mt-4 text-xs font-medium text-slate-500">Connect analytics to track</p>
        </div>

        <div className="p-6 rounded-[2rem] bg-white/5 backdrop-blur-xl border border-white/10 hover:border-[#FFC300]/30 transition-all duration-300 hover:-translate-y-1 shadow-[0_0_20px_rgba(0,0,0,0.1)] group">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-[#D6D6D6] uppercase tracking-wider">Unique Contacts</h3>
            <div className="w-10 h-10 rounded-xl bg-[#FFC300]/10 flex items-center justify-center text-[#FFC300] border border-[#FFC300]/20 group-hover:bg-[#FFC300]/20 transition-colors">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <p className="text-4xl font-black text-white group-hover:text-[#FFC300] transition-colors">
            {new Set(submissions.map((s) => s.email)).size}
          </p>
          <p className="mt-4 text-xs font-medium text-slate-500">Based on contact emails</p>
        </div>

        <div className="p-6 rounded-[2rem] bg-white/5 backdrop-blur-xl border border-white/10 hover:border-white/20 transition-all duration-300 hover:-translate-y-1 shadow-[0_0_20px_rgba(0,0,0,0.1)]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-[#D6D6D6] uppercase tracking-wider">Engagement</h3>
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400 border border-purple-500/20">
              <MousePointerClick className="w-5 h-5" />
            </div>
          </div>
          <p className="text-4xl font-black text-white">—</p>
          <p className="mt-4 text-xs font-medium text-slate-500">Connect analytics to track</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick links */}
        <div className="p-8 rounded-[2rem] bg-white/5 backdrop-blur-xl border border-white/10 shadow-[0_0_30px_rgba(0,0,0,0.1)]">
          <h3 className="text-xl font-bold text-white mb-6">Quick Access</h3>
          <div className="space-y-3">
            {[
              { href: "/admin/pages", label: "Manage Pages & Sections", icon: "📄" },
              { href: "/admin/blog", label: "Blog Posts", icon: "✍️" },
              { href: "/admin/projects", label: "Portfolio Projects", icon: "💼" },
              { href: "/admin/inquiries", label: "Customer Inquiries", icon: "📬" },
              { href: "/admin/media", label: "Media Library", icon: "🖼️" },
              { href: "/admin/settings", label: "System Settings", icon: "⚙️" },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 px-5 py-4 rounded-xl bg-[#1C1B1A]/50 border border-transparent hover:border-[#FFC300]/30 hover:bg-[#FFC300]/5 text-[#D6D6D6] hover:text-[#FFC300] font-bold text-sm transition-all group"
              >
                <span className="text-lg grayscale group-hover:grayscale-0 transition-all">{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Inquiries */}
        <div className="lg:col-span-2 p-8 rounded-[2rem] bg-white/5 backdrop-blur-xl border border-white/10 shadow-[0_0_30px_rgba(0,0,0,0.1)]">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-bold text-white">Recent Transmissions</h3>
            <Link
              href="/admin/inquiries"
              className="text-xs font-bold text-[#FFC300] uppercase tracking-widest hover:text-white transition-colors flex items-center gap-1"
            >
              View all <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>

          {recent.length === 0 ? (
            <div className="text-center py-16 text-slate-500 bg-[#1C1B1A]/30 rounded-2xl border border-white/5">
              <MessageSquare className="w-10 h-10 mx-auto mb-4 opacity-30" />
              <p className="text-sm font-medium">No signals detected yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {recent.map((sub) => (
                <div
                  key={sub.id}
                  className="flex items-start gap-5 p-5 rounded-xl bg-[#1C1B1A]/50 border border-white/5 hover:border-[#FFC300]/20 transition-colors"
                >
                  <div className="w-12 h-12 rounded-xl bg-[#FFC300]/10 border border-[#FFC300]/20 flex items-center justify-center text-[#FFC300] font-black text-lg flex-shrink-0">
                    {sub.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0 pt-0.5">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <p className="text-white text-base font-bold truncate">{sub.name}</p>
                      <span className="text-slate-500 text-xs font-medium whitespace-nowrap bg-white/5 px-2 py-1 rounded-md">
                        {new Date(sub.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </span>
                    </div>
                    <p className="text-[#FFC300] text-sm font-medium mb-2 truncate">{sub.email}</p>
                    <p className="text-[#D6D6D6] text-sm line-clamp-2 leading-relaxed bg-white/5 p-3 rounded-lg">{sub.message}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
