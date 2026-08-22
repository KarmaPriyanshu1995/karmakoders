import { listMyTenantMembers, createTenantMember, updateMemberRole, updateMemberStatus, removeMember, resetMemberPassword } from "@/lib/membership-actions";
import { Users, Shield } from "lucide-react";
import { MemberRoleSelect } from "@/components/admin/MemberRoleSelect";
import { AddMemberForm } from "@/components/admin/AddMemberForm";
import { DeleteConfirmButton } from "@/components/admin/DeleteConfirmButton";
import { MemberStatusToggle } from "@/components/admin/MemberStatusToggle";
import { ResetPasswordButton } from "@/components/admin/ResetPasswordButton";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Users | karmakoders Admin",
};

export default async function UsersPage() {
  const members = await listMyTenantMembers();

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Users</h2>
          <p className="text-slate-400 mt-1">
            People with access to this organization&apos;s admin dashboard
          </p>
        </div>
        <AddMemberForm createAction={createTenantMember} />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="glass-card rounded-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-slate-400">Total Members</h3>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-bold text-white">{members.length}</p>
        </div>
        <div className="glass-card rounded-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-slate-400">Active</h3>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Shield className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-bold text-white">{members.filter((m) => m.status === "ACTIVE").length}</p>
        </div>
      </div>

      {/* Members table */}
      <div className="glass-card rounded-xl overflow-hidden border border-slate-800">
        <div className="px-6 py-4 border-b border-slate-800">
          <h3 className="text-white font-semibold">Members</h3>
        </div>
        <div className="divide-y divide-slate-800">
          {members.map((m) => (
            <div key={m.id} className="px-6 py-4 flex items-center gap-4 flex-wrap">
              <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-sm font-bold text-white shrink-0">
                {(m.user.name || m.user.email).charAt(0).toUpperCase()}
              </div>
              <div className="min-w-[180px]">
                <p className="text-white font-semibold">{m.user.name || "—"}</p>
                <p className="text-slate-400 text-sm">{m.user.email}</p>
              </div>
              <div className="ml-auto flex items-center gap-2 flex-wrap">
                <MemberRoleSelect membershipId={m.id} initialRole={m.role} action={updateMemberRole} />
                <MemberStatusToggle membershipId={m.id} initialStatus={m.status} action={updateMemberStatus} />
                <ResetPasswordButton membershipId={m.id} email={m.user.email} action={resetMemberPassword} />
                <DeleteConfirmButton
                  iconOnly
                  confirmTitle="Remove this member?"
                  confirmMessage={`${m.user.email} will lose access to this organization's admin dashboard.`}
                  onDelete={async () => {
                    "use server";
                    await removeMember(m.id);
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
