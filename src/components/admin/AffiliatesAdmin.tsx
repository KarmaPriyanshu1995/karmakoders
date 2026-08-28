"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DeleteConfirmButton } from "@/components/admin/DeleteConfirmButton";
import { deleteAffiliateProgram, upsertAffiliateProgram } from "@/lib/tool-actions";

type Program = {
  id: string;
  providerId: string;
  programName: string;
  affiliateNetwork: string | null;
  trackingUrl: string;
  status: string;
  commissionType: string | null;
  commissionValue: number | null;
  cookieDuration: number | null;
  notes: string | null;
  provider: { name: string };
};

export function AffiliatesAdmin({
  programs,
  providers,
}: {
  programs: Program[];
  providers: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [form, setForm] = useState({
    providerId: providers[0]?.id || "",
    programName: "",
    trackingUrl: "",
    affiliateNetwork: "",
    commissionType: "percent",
    commissionValue: "",
    cookieDuration: "",
    notes: "",
  });

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        {programs.map((program) => (
          <div key={program.id} className="rounded-xl border border-white/10 p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <p className="text-white font-medium">{program.programName}</p>
              <p className="text-xs text-slate-500">{program.provider.name} · {program.status}</p>
              <p className="text-xs text-slate-400 break-all mt-1">{program.trackingUrl}</p>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={async () => {
                  await upsertAffiliateProgram({
                    id: program.id,
                    providerId: program.providerId,
                    programName: program.programName,
                    trackingUrl: program.trackingUrl,
                    affiliateNetwork: program.affiliateNetwork || undefined,
                    status: program.status === "active" ? "disabled" : "active",
                    commissionType: program.commissionType || undefined,
                    commissionValue: program.commissionValue,
                    cookieDuration: program.cookieDuration,
                    notes: program.notes || undefined,
                  });
                  router.refresh();
                }}
              >
                {program.status === "active" ? "Disable" : "Enable"}
              </Button>
              <DeleteConfirmButton
                iconOnly
                onDelete={async () => {
                  await deleteAffiliateProgram(program.id);
                  router.refresh();
                }}
              />
            </div>
          </div>
        ))}
      </div>

      <form
        className="grid gap-3 max-w-2xl"
        onSubmit={async (e) => {
          e.preventDefault();
          try {
            await upsertAffiliateProgram({
              ...form,
              commissionValue: form.commissionValue ? Number(form.commissionValue) : null,
              cookieDuration: form.cookieDuration ? Number(form.cookieDuration) : null,
            });
            toast.success("Affiliate program saved");
            router.refresh();
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed");
          }
        }}
      >
        <h3 className="font-bold text-white">Add affiliate program</h3>
        <select className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800" value={form.providerId} onChange={(e) => setForm({ ...form, providerId: e.target.value })}>
          {providers.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <input className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800" placeholder="Program name" value={form.programName} onChange={(e) => setForm({ ...form, programName: e.target.value })} />
        <input className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800" placeholder="https:// tracking URL" value={form.trackingUrl} onChange={(e) => setForm({ ...form, trackingUrl: e.target.value })} />
        <input className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800" placeholder="Network (optional)" value={form.affiliateNetwork} onChange={(e) => setForm({ ...form, affiliateNetwork: e.target.value })} />
        <div className="grid grid-cols-2 gap-3">
          <input className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800" placeholder="Commission type" value={form.commissionType} onChange={(e) => setForm({ ...form, commissionType: e.target.value })} />
          <input className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800" placeholder="Commission value" value={form.commissionValue} onChange={(e) => setForm({ ...form, commissionValue: e.target.value })} />
        </div>
        <input className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800" placeholder="Cookie duration (days)" value={form.cookieDuration} onChange={(e) => setForm({ ...form, cookieDuration: e.target.value })} />
        <textarea className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800" placeholder="Internal notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        <Button type="submit">Save program</Button>
      </form>
    </div>
  );
}
