import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import {
  getTenantDetail,
  addTenantMemberAsSuperAdmin,
  updateMemberRoleAsSuperAdmin,
  updateMemberStatusAsSuperAdmin,
  removeMemberAsSuperAdmin,
  resetMemberPasswordAsSuperAdmin,
  updateMemberPermissionsAsSuperAdmin,
} from "@/lib/membership-actions";
import { TenantStatusToggle } from "@/components/admin/TenantStatusToggle";
import { AddMemberForm } from "@/components/admin/AddMemberForm";
import { MemberRoleSelect } from "@/components/admin/MemberRoleSelect";
import { MemberStatusToggle } from "@/components/admin/MemberStatusToggle";
import { ResetPasswordButton } from "@/components/admin/ResetPasswordButton";
import { MemberPermissionsButton } from "@/components/admin/MemberPermissionsButton";
import { DeleteConfirmButton } from "@/components/admin/DeleteConfirmButton";
import type { PermissionOverrides } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function TenantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tenant = await getTenantDetail(id);

  const createMember = async (input: { name: string; email: string; role: import("@prisma/client").MembershipRole }) => {
    "use server";
    return addTenantMemberAsSuperAdmin(id, input);
  };

  const changeRole = async (membershipId: string, role: import("@prisma/client").MembershipRole) => {
    "use server";
    return updateMemberRoleAsSuperAdmin(id, membershipId, role);
  };

  const changeStatus = async (membershipId: string, status: import("@prisma/client").MembershipStatus) => {
    "use server";
    return updateMemberStatusAsSuperAdmin(id, membershipId, status);
  };

  const resetPassword = async (membershipId: string) => {
    "use server";
    return resetMemberPasswordAsSuperAdmin(id, membershipId);
  };

  const changePermissions = async (membershipId: string, overrides: PermissionOverrides) => {
    "use server";
    return updateMemberPermissionsAsSuperAdmin(id, membershipId, overrides);
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Link href="/admin/platform/tenants" className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/5">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-white">{tenant.name}</h2>
          <p className="text-slate-400 mt-1">/{tenant.slug}{tenant.email ? ` · ${tenant.email}` : ""}</p>
        </div>
        <TenantStatusToggle tenantId={tenant.id} initialStatus={tenant.status} isPrimary={tenant.isPrimary} />
      </div>

      <div className="glass-card rounded-xl overflow-hidden border border-slate-800">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-white font-semibold">Members ({tenant.memberships.length})</h3>
          <AddMemberForm createAction={createMember} />
        </div>
        <div className="divide-y divide-slate-800">
          {tenant.memberships.length === 0 && (
            <p className="px-6 py-8 text-center text-slate-500 text-sm">No members yet.</p>
          )}
          {tenant.memberships.map((m) => (
            <div key={m.id} className="px-6 py-4 flex items-center gap-4 flex-wrap">
              <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-sm font-bold text-white shrink-0">
                {(m.user.name || m.user.email).charAt(0).toUpperCase()}
              </div>
              <div className="min-w-[180px]">
                <p className="text-white font-semibold">{m.user.name || "—"}</p>
                <p className="text-slate-400 text-sm">{m.user.email}</p>
              </div>
              <div className="ml-auto flex items-center gap-2 flex-wrap">
                <MemberRoleSelect membershipId={m.id} initialRole={m.role} action={changeRole} />
                <MemberStatusToggle membershipId={m.id} initialStatus={m.status} action={changeStatus} />
                <ResetPasswordButton membershipId={m.id} email={m.user.email} action={resetPassword} />
                <MemberPermissionsButton
                  membershipId={m.id}
                  email={m.user.email}
                  role={m.role}
                  permissionOverrides={m.permissionOverrides as PermissionOverrides | null}
                  action={changePermissions}
                />
                <DeleteConfirmButton
                  iconOnly
                  confirmTitle="Remove this member?"
                  confirmMessage={`${m.user.email} will lose access to ${tenant.name}'s admin dashboard.`}
                  onDelete={async () => {
                    "use server";
                    const result = await removeMemberAsSuperAdmin(id, m.id);
                    if (result.error) throw new Error(result.error);
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
