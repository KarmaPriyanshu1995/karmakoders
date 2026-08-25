"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import type { TenantStatus } from "@prisma/client";
import { setTenantStatus } from "@/lib/membership-actions";

export function TenantStatusToggle({
  tenantId,
  initialStatus,
  isPrimary = false,
}: {
  tenantId: string;
  initialStatus: TenantStatus;
  isPrimary?: boolean;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [loading, setLoading] = useState(false);

  const toggle = async () => {
    if (isPrimary && status === "ACTIVE") {
      toast.error("The primary tenant cannot be suspended");
      return;
    }
    const next: TenantStatus = status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
    setLoading(true);
    try {
      const result = await setTenantStatus(tenantId, next);
      if (result.error) {
        toast.error(result.error);
      } else {
        setStatus(next);
        toast.success(next === "ACTIVE" ? "Tenant activated" : "Tenant suspended");
        router.refresh();
      }
    } catch {
      toast.error("Failed to update tenant status");
    }
    setLoading(false);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={loading || (isPrimary && status === "ACTIVE")}
      className={`px-3 py-1.5 text-xs font-bold rounded-full border transition-colors disabled:opacity-50 ${
        status === "ACTIVE"
          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-rose-500/10 hover:text-rose-400 hover:border-rose-500/20"
          : "bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-emerald-500/10 hover:text-emerald-400 hover:border-emerald-500/20"
      }`}
      title={
        isPrimary
          ? "The primary tenant cannot be suspended"
          : status === "ACTIVE"
            ? "Click to suspend"
            : "Click to activate"
      }
    >
      {status}
    </button>
  );
}
