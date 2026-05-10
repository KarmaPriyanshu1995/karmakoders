import { getContactSubmissions } from "@/lib/actions";
import { MessageSquare, Eye, MousePointerClick, Users } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const submissions = await getContactSubmissions();
  const recent = submissions.slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="glass-card rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-slate-400">Total Inquiries</h3>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center text-indigo-400">
              <MessageSquare className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-bold text-white">{submissions.length}</p>
          <Link href="/admin/inquiries" className="mt-2 text-sm text-indigo-400 hover:text-indigo-300 transition-colors block">
            View all →
          </Link>
        </div>

        <div className="glass-card rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-slate-400">Page Views</h3>
            <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center text-cyan-400">
              <Eye className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-bold text-white">—</p>
          <p className="mt-2 text-xs text-slate-600">Connect analytics to track</p>
        </div>

        <div className="glass-card rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-slate-400">Unique Visitors</h3>
            <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center text-purple-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-bold text-white">
            {new Set(submissions.map((s) => s.email)).size}
          </p>
          <p className="mt-2 text-xs text-slate-500">Based on contact emails</p>
        </div>

        <div className="glass-card rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-slate-400">Engagement</h3>
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-400">
              <MousePointerClick className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-bold text-white">—</p>
          <p className="mt-2 text-xs text-slate-600">Connect analytics to track</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick links */}
        <div className="glass-card rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Quick Access</h3>
          <div className="space-y-2">
            {[
              { href: "/admin/pages", label: "📄 Manage Pages & Sections" },
              { href: "/admin/blog", label: "✍️ Blog Posts" },
              { href: "/admin/projects", label: "💼 Portfolio Projects" },
              { href: "/admin/inquiries", label: "📬 Customer Inquiries" },
              { href: "/admin/media", label: "🖼️ Media Library" },
              { href: "/admin/settings", label: "⚙️ Settings" },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="block px-4 py-2.5 rounded-lg bg-slate-800/40 hover:bg-slate-800 text-slate-300 hover:text-white text-sm transition-colors"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Inquiries */}
        <div className="lg:col-span-2 glass-card rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-white">Recent Inquiries</h3>
            <Link
              href="/admin/inquiries"
              className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              View all
            </Link>
          </div>

          {recent.length === 0 ? (
            <div className="text-center py-10 text-slate-500">
              <MessageSquare className="w-8 h-8 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No inquiries yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {recent.map((sub) => (
                <div
                  key={sub.id}
                  className="flex items-start gap-4 pb-4 border-b border-slate-800 last:border-0 last:pb-0"
                >
                  <div className="w-9 h-9 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold text-sm flex-shrink-0">
                    {sub.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-white text-sm font-medium truncate">{sub.name}</p>
                      <span className="text-slate-600 text-xs whitespace-nowrap">
                        {new Date(sub.createdAt).toLocaleDateString("en-IN")}
                      </span>
                    </div>
                    <p className="text-slate-400 text-xs mt-1 truncate">{sub.email}</p>
                    <p className="text-slate-500 text-xs mt-1 line-clamp-1">{sub.message}</p>
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
