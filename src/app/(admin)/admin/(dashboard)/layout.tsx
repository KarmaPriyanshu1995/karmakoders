import { ReactNode } from "react";
import { AdminSidebar } from "@/components/admin/AdminSidebar";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-950 flex text-slate-200 font-sans selection:bg-indigo-500/30">
      <AdminSidebar />

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-screen overflow-hidden">
        <header className="h-16 flex items-center justify-between px-8 border-b border-slate-800 bg-slate-900/50 backdrop-blur sticky top-0 z-10">
          <h1 className="text-lg font-semibold text-white">Admin Panel</h1>
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-sm font-bold text-white shadow-lg">
              P
            </div>
          </div>
        </header>
        <div className="flex-1 overflow-auto p-8">{children}</div>
      </main>
    </div>
  );
}


