"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Building2, Check } from "lucide-react";
import { toast } from "sonner";
import { switchActiveTenant } from "@/lib/membership-actions";

interface TenantOption {
  id: string;
  name: string;
  slug: string;
  status: string;
}

export function TenantSwitcher({ tenants, currentTenantId }: { tenants: TenantOption[]; currentTenantId: string | null }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const current = tenants.find((t) => t.id === currentTenantId) ?? tenants[0];

  if (tenants.length <= 1) {
    return current ? (
      <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-[#D6D6D6] text-sm font-semibold">
        <Building2 className="w-3.5 h-3.5 text-[#FFC300]" />
        {current.name}
      </div>
    ) : null;
  }

  const handleSelect = (tenantId: string) => {
    if (tenantId === currentTenantId) {
      setOpen(false);
      return;
    }
    startTransition(async () => {
      const result = await switchActiveTenant(tenantId);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={pending}
        className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 hover:border-[#FFC300]/30 text-[#D6D6D6] hover:text-white text-sm font-semibold transition-all disabled:opacity-50"
      >
        <Building2 className="w-3.5 h-3.5 text-[#FFC300]" />
        {current?.name ?? "Select organization"}
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-64 rounded-xl border border-white/10 bg-[#1C1B1A] shadow-2xl z-40 py-2 max-h-80 overflow-y-auto">
            {tenants.map((t) => (
              <button
                key={t.id}
                onClick={() => handleSelect(t.id)}
                className="w-full flex items-center justify-between px-4 py-2.5 text-left text-sm text-[#D6D6D6] hover:bg-white/5 hover:text-white transition-colors"
              >
                <span className="flex flex-col">
                  <span className="font-semibold">{t.name}</span>
                  <span className="text-xs text-slate-500">/{t.slug}{t.status === "SUSPENDED" ? " · suspended" : ""}</span>
                </span>
                {t.id === currentTenantId && <Check className="w-4 h-4 text-[#FFC300] shrink-0" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
