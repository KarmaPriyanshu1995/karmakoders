"use client";

import { useState } from "react";
import { toast } from "sonner";
import type { MembershipStatus } from "@prisma/client";

interface MemberStatusToggleProps {
  membershipId: string;
  initialStatus: MembershipStatus;
  action: (membershipId: string, status: MembershipStatus) => Promise<unknown>;
}

export function MemberStatusToggle({ membershipId, initialStatus, action }: MemberStatusToggleProps) {
  const [status, setStatus] = useState(initialStatus);
  const [loading, setLoading] = useState(false);

  const toggle = async () => {
    const next: MembershipStatus = status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
    setLoading(true);
    try {
      const result = (await action(membershipId, next)) as { error?: string | null } | void;
      if (result && typeof result === "object" && result.error) {
        toast.error(result.error);
      } else {
        setStatus(next);
        toast.success(next === "ACTIVE" ? "Member reactivated" : "Member suspended");
      }
    } catch {
      toast.error("Failed to update status");
    }
    setLoading(false);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={loading}
      className={`px-3 py-1.5 text-xs font-bold rounded-full border transition-colors disabled:opacity-50 ${
        status === "ACTIVE"
          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-rose-500/10 hover:text-rose-400 hover:border-rose-500/20"
          : "bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-emerald-500/10 hover:text-emerald-400 hover:border-emerald-500/20"
      }`}
      title={status === "ACTIVE" ? "Click to suspend" : "Click to reactivate"}
    >
      {status}
    </button>
  );
}
