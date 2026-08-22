"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import type { TenantStatus } from "@prisma/client";
import { setTenantStatus } from "@/lib/membership-actions";

export function TenantStatusToggle({ tenantId, initialStatus }: { tenantId: string; initialStatus: TenantStatus }) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [loading, setLoading] = useState(false);

  const toggle = async () => {
    const next: TenantStatus = status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
    setLoading(true);
    try {
      await setTenantStatus(tenantId, next);
      setStatus(next);
      toast.success(next === "ACTIVE" ? "Tenant activated" : "Tenant suspended");
      router.refresh();
    } catch {
      toast.error("Failed to update tenant status");
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
      title={status === "ACTIVE" ? "Click to suspend" : "Click to activate"}
    >
      {status}
    </button>
  );
}
