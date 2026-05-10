import { getContactSubmissions } from "@/lib/actions";
import { Users, Mail } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Users | karmakoders Admin",
};

export default async function UsersPage() {
  const submissions = await getContactSubmissions();

  // Unique visitors based on email from contact submissions
  const uniqueVisitors = Array.from(
    new Map(submissions.map((s) => [s.email, s])).values()
  );

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-white">Users & Visitors</h2>
        <p className="text-slate-400 mt-1">
          People who have contacted you through your website
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="glass-card rounded-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-slate-400">Total Contacts</h3>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Mail className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-bold text-white">{submissions.length}</p>
        </div>
        <div className="glass-card rounded-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-slate-400">Unique Visitors</h3>
            <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center text-purple-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-bold text-white">{uniqueVisitors.length}</p>
        </div>
      </div>

      {/* Admins */}
      <div className="glass-card rounded-xl overflow-hidden border border-slate-800">
        <div className="px-6 py-4 border-b border-slate-800">
          <h3 className="text-white font-semibold">Admin Account</h3>
        </div>
        <div className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-sm font-bold text-white">
              P
            </div>
            <div>
              <p className="text-white font-semibold">Priyanshu</p>
              <p className="text-slate-400 text-sm">karmakoders@gmail.com</p>
            </div>
            <span className="ml-auto px-3 py-1 text-xs font-bold bg-indigo-500/20 text-indigo-300 rounded-full border border-indigo-500/30">
              ADMIN
            </span>
          </div>
        </div>
      </div>

      {/* Unique contacts */}
      {uniqueVisitors.length > 0 && (
        <div className="glass-card rounded-xl overflow-hidden border border-slate-800">
          <div className="px-6 py-4 border-b border-slate-800">
            <h3 className="text-white font-semibold">People Who Contacted You</h3>
          </div>
          <div className="divide-y divide-slate-800">
            {uniqueVisitors.map((user) => (
              <div key={user.email} className="px-6 py-4 flex items-center gap-4">
                <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center text-sm font-bold text-slate-300">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-white text-sm font-medium">{user.name}</p>
                  <p className="text-slate-400 text-xs">{user.email}</p>
                </div>
                <a
                  href={`mailto:${user.email}`}
                  className="ml-auto px-3 py-1 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-full transition-colors"
                >
                  Send Email
                </a>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
