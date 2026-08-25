import Link from "next/link";
import { Building2, Users, ArrowUpRight } from "lucide-react";
import { listTenants } from "@/lib/membership-actions";
import { CreateTenantForm } from "@/components/admin/CreateTenantForm";
import { TenantStatusToggle } from "@/components/admin/TenantStatusToggle";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Tenants | karmakoders Platform",
};

export default async function PlatformTenantsPage() {
  const tenants = await listTenants();

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Platform · Tenants</h2>
          <p className="text-slate-400 mt-1">Every organization running on this platform</p>
        </div>
        <CreateTenantForm />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="glass-card rounded-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-slate-400">Total Tenants</h3>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-bold text-white">{tenants.length}</p>
        </div>
        <div className="glass-card rounded-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-slate-400">Active</h3>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-bold text-white">{tenants.filter((t) => t.status === "ACTIVE").length}</p>
        </div>
      </div>

      <div className="glass-card rounded-xl overflow-hidden border border-slate-800">
        <div className="px-6 py-4 border-b border-slate-800">
          <h3 className="text-white font-semibold">Tenants</h3>
        </div>
        <div className="divide-y divide-slate-800">
          {tenants.map((t) => (
            <div key={t.id} className="px-6 py-4 flex items-center gap-4 flex-wrap">
              <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-sm font-bold text-white shrink-0">
                {t.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-[180px]">
                <div className="flex items-center gap-2">
                  <p className="text-white font-semibold">{t.name}</p>
                  {t.isPrimary && (
                    <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full">
                      PRIMARY
                    </span>
                  )}
                </div>
                <p className="text-slate-400 text-sm">/{t.slug}</p>
              </div>
              <div className="flex items-center gap-1.5 text-slate-400 text-sm">
                <Users className="w-3.5 h-3.5" />
                {t._count.memberships}
              </div>
              <div className="ml-auto flex items-center gap-3">
                <TenantStatusToggle tenantId={t.id} initialStatus={t.status} isPrimary={t.isPrimary} />
                <Link
                  href={`/admin/platform/tenants/${t.id}`}
                  className="text-xs font-bold text-indigo-400 hover:text-white uppercase tracking-widest flex items-center gap-1"
                >
                  View <ArrowUpRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
