"use client";

import { useState } from "react";
import { toast } from "sonner";
import type { MembershipRole } from "@prisma/client";

const ROLE_OPTIONS: MembershipRole[] = ["TENANT_ADMIN", "MANAGER", "EDITOR", "AUTHOR", "HR", "EMPLOYEE", "VIEWER"];

interface MemberRoleSelectProps {
  membershipId: string;
  initialRole: MembershipRole;
  action: (membershipId: string, role: MembershipRole) => Promise<unknown>;
}

export function MemberRoleSelect({ membershipId, initialRole, action }: MemberRoleSelectProps) {
  const [role, setRole] = useState(initialRole);
  const [loading, setLoading] = useState(false);

  const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newRole = e.target.value as MembershipRole;
    const prev = role;
    setRole(newRole);
    setLoading(true);
    try {
      await action(membershipId, newRole);
      toast.success(`Role updated to ${newRole}`);
    } catch (error) {
      console.error(error);
      setRole(prev);
      toast.error("Failed to update role");
    }
    setLoading(false);
  };

  return (
    <select
      value={role}
      disabled={loading}
      onChange={handleChange}
      className="text-sm font-medium py-1.5 px-2.5 rounded-lg border outline-none appearance-none cursor-pointer transition-all disabled:opacity-50 bg-indigo-500/10 text-indigo-300 border-indigo-500/20"
    >
      {ROLE_OPTIONS.map((r) => (
        <option key={r} value={r} className="bg-slate-950 text-white">
          {r}
        </option>
      ))}
    </select>
  );
}
