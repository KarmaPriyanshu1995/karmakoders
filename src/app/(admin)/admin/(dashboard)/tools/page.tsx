import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getToolsAdmin } from "@/lib/tool-actions";
import { ToolsAdminList } from "@/components/admin/ToolsAdminList";
import { requireTenantContext } from "@/lib/tenant-context";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function AdminToolsPage() {
  const { role, permissionOverrides } = await requireTenantContext();
  const { tools, stats } = await getToolsAdmin();
  const canCreate = hasPermission(role, PERMISSIONS.TOOLS_CREATE, permissionOverrides);
  const canUpdate = hasPermission(role, PERMISSIONS.TOOLS_UPDATE, permissionOverrides);
  const canDelete = hasPermission(role, PERMISSIONS.TOOLS_DELETE, permissionOverrides);

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-start gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Tools</h2>
          <p className="text-slate-400 mt-1">Manage public free tools, SEO, and Domain Compare.</p>
        </div>
        {canCreate && (
          <Link href="/admin/tools/new">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Tool
            </Button>
          </Link>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          ["Total Tools", stats.total],
          ["Published", stats.published],
          ["Draft", stats.draft],
          ["Archived", stats.archived],
        ].map(([label, value]) => (
          <div key={String(label)} className="rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-widest text-slate-500">{label}</p>
            <p className="text-2xl font-bold text-white mt-1">{value}</p>
          </div>
        ))}
      </div>

      <ToolsAdminList tools={tools} canCreate={canCreate} canUpdate={canUpdate} canDelete={canDelete} />
    </div>
  );
}
