import { ReactNode } from "react";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { TenantSwitcher } from "@/components/admin/TenantSwitcher";
import { TenantStoreHydrator } from "@/components/admin/TenantStoreHydrator";
import { getCurrentUser, listMyTenants, requireTenantContext } from "@/lib/tenant-context";
import type { MembershipRole } from "@prisma/client";
import type { PermissionOverrides } from "@/lib/permissions";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  const tenants = user ? await listMyTenants() : [];
  let currentTenantId: string | null = null;
  let currentRole: MembershipRole | null = null;
  let currentPermissionOverrides: PermissionOverrides | null = null;
  try {
    const ctx = await requireTenantContext();
    currentTenantId = ctx.tenantId;
    currentRole = ctx.role;
    currentPermissionOverrides = ctx.permissionOverrides;
  } catch {
    // No tenant resolvable (e.g. a brand-new platform with zero tenants) -- switcher handles this.
  }
  const currentTenant = tenants.find((t) => t.id === currentTenantId) ?? null;

  const initial = (user?.name || user?.email || "?").charAt(0).toUpperCase();

  return (
    <div className="min-h-screen bg-[#252422] flex text-[#D6D6D6] font-sans selection:bg-[#FFC300]/30 selection:text-white">
      <TenantStoreHydrator
        currentUser={user}
        currentTenant={currentTenant}
        currentRole={currentRole}
        currentPermissionOverrides={currentPermissionOverrides}
        memberships={tenants}
      />
      <AdminSidebar
        isSuperAdmin={user?.isSuperAdmin ?? false}
        role={currentRole}
        permissionOverrides={currentPermissionOverrides}
      />

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-screen overflow-hidden bg-[#252422]">
        <header className="h-16 flex items-center justify-between px-8 border-b border-white/5 bg-[#1C1B1A]/80 backdrop-blur-xl sticky top-0 z-10">
          <h1 className="text-lg font-bold text-white tracking-wide">Command Center</h1>
          <div className="flex items-center gap-4">
            <TenantSwitcher tenants={tenants} currentTenantId={currentTenantId} />
            <div
              className="w-9 h-9 rounded-full bg-[#FFC300] flex items-center justify-center text-sm font-black text-[#1C1B1A] shadow-[0_0_15px_rgba(255,195,0,0.4)] hover:scale-105 transition-transform cursor-pointer"
              title={user?.email ?? undefined}
            >
              {initial}
            </div>
          </div>
        </header>
        <div className="flex-1 overflow-auto p-8 relative">
           {/* Subtle background glow */}
           <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#FFC300] opacity-[0.02] blur-[150px] pointer-events-none rounded-full" />
           <div className="relative z-10 max-w-7xl mx-auto">{children}</div>
        </div>
      </main>
    </div>
  );
}
