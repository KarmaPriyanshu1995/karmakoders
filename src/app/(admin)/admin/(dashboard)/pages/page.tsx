import { getPages } from "@/lib/actions";
import Link from "next/link";
import { Edit2, Globe, File, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { requireTenantContext } from "@/lib/tenant-context";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function AdminPagesList() {
  const { role, permissionOverrides } = await requireTenantContext();
  const canCreate = hasPermission(role, PERMISSIONS.PAGE_CREATE, permissionOverrides);
  const pages = await getPages();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Pages & Sections</h2>
          <p className="text-slate-400 mt-1">Manage your website&apos;s pages and their content sections.</p>
        </div>
        {canCreate && (
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Create Page
          </Button>
        )}
      </div>

      <div className="glass-card rounded-xl overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-900/50">
              <th className="p-4 font-medium text-slate-300">Page Title</th>
              <th className="p-4 font-medium text-slate-300">Slug</th>
              <th className="p-4 font-medium text-slate-300">Status</th>
              <th className="p-4 font-medium text-slate-300">Sections</th>
              <th className="p-4 font-medium text-slate-300 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {pages.map((page) => (
              <tr key={page.id} className="hover:bg-slate-800/20 transition-colors">
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-slate-800 flex items-center justify-center text-indigo-400">
                      <File className="w-4 h-4" />
                    </div>
                    <span className="font-medium text-white">{page.title}</span>
                  </div>
                </td>
                <td className="p-4 text-slate-400">{page.slug}</td>
                <td className="p-4">
                  {page.isPublished ? (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <Globe className="w-3 h-3 mr-1" /> Published
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      Draft
                    </span>
                  )}
                </td>
                <td className="p-4 text-slate-400">{page.sections.length} sections</td>
                <td className="p-4 text-right">
                  <Link href={`/admin/pages/${page.id}`}>
                    <Button variant="ghost" size="sm" className="h-8 text-slate-400 hover:text-indigo-400">
                      <Edit2 className="w-4 h-4 mr-2" /> Edit
                    </Button>
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
