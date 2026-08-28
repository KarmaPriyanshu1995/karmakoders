"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { upsertProvider } from "@/lib/tool-actions";

type Provider = {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  websiteUrl: string | null;
  apiEnabled: boolean;
  affiliateEnabled: boolean;
  status: string;
  priority: number;
  adapterKey: string;
  lastSuccessAt: Date | string | null;
  lastErrorAt: Date | string | null;
  lastError: string | null;
  lastResponseMs: number | null;
};

function ago(value: Date | string | null) {
  if (!value) return "Never";
  const t = new Date(value).getTime();
  const mins = Math.round((Date.now() - t) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  return `${Math.round(mins / 60)}h ago`;
}

export function ProvidersAdmin({
  providers,
  adapterKeys,
}: {
  providers: Provider[];
  adapterKeys: string[];
}) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    slug: "",
    websiteUrl: "",
    logoUrl: "",
    adapterKey: adapterKeys[0] || "godaddy",
    priority: 100,
  });

  return (
    <div className="space-y-8">
      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full text-left text-sm">
          <thead className="bg-white/5 text-slate-400">
            <tr>
              <th className="p-3">Provider</th>
              <th className="p-3">API</th>
              <th className="p-3">Affiliate</th>
              <th className="p-3">Last success</th>
              <th className="p-3">Last error</th>
              <th className="p-3">Latency</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {providers.map((provider) => (
              <tr key={provider.id}>
                <td className="p-3">
                  <p className="text-white font-medium">{provider.name}</p>
                  <p className="text-xs text-slate-500">{provider.adapterKey}</p>
                </td>
                <td className="p-3">
                  {provider.apiEnabled && provider.status === "active" ? (
                    <span className="text-emerald-400">Enabled</span>
                  ) : (
                    <span className="text-amber-400">Disabled</span>
                  )}
                </td>
                <td className="p-3">{provider.affiliateEnabled ? "On" : "Off"}</td>
                <td className="p-3 text-slate-400">{ago(provider.lastSuccessAt)}</td>
                <td className="p-3 text-slate-400">{provider.lastError || "—"}</td>
                <td className="p-3 text-slate-400">{provider.lastResponseMs != null ? `${provider.lastResponseMs}ms` : "—"}</td>
                <td className="p-3 text-right space-x-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={async () => {
                      await upsertProvider({
                        id: provider.id,
                        name: provider.name,
                        slug: provider.slug,
                        logoUrl: provider.logoUrl || undefined,
                        websiteUrl: provider.websiteUrl || undefined,
                        adapterKey: provider.adapterKey,
                        priority: provider.priority,
                        apiEnabled: !provider.apiEnabled,
                        affiliateEnabled: provider.affiliateEnabled,
                        status: provider.status,
                      });
                      toast.success(provider.apiEnabled ? "API disabled" : "API enabled");
                      router.refresh();
                    }}
                  >
                    {provider.apiEnabled ? "Disable API" : "Enable API"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={async () => {
                      await upsertProvider({
                        id: provider.id,
                        name: provider.name,
                        slug: provider.slug,
                        logoUrl: provider.logoUrl || undefined,
                        websiteUrl: provider.websiteUrl || undefined,
                        adapterKey: provider.adapterKey,
                        priority: provider.priority,
                        apiEnabled: provider.apiEnabled,
                        affiliateEnabled: !provider.affiliateEnabled,
                        status: provider.status,
                      });
                      router.refresh();
                    }}
                  >
                    {provider.affiliateEnabled ? "Disable affiliate" : "Enable affiliate"}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <form
        className="grid md:grid-cols-2 gap-3 max-w-3xl"
        onSubmit={async (e) => {
          e.preventDefault();
          try {
            await upsertProvider({ ...form, apiEnabled: true, status: "active" });
            toast.success("Provider saved");
            router.refresh();
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed");
          }
        }}
      >
        <h3 className="md:col-span-2 font-bold text-white">Add provider</h3>
        <input className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800" placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800" placeholder="Slug" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
        <input className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800" placeholder="Website URL" value={form.websiteUrl} onChange={(e) => setForm({ ...form, websiteUrl: e.target.value })} />
        <input className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800" placeholder="Logo URL" value={form.logoUrl} onChange={(e) => setForm({ ...form, logoUrl: e.target.value })} />
        <select className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800" value={form.adapterKey} onChange={(e) => setForm({ ...form, adapterKey: e.target.value })}>
          {adapterKeys.map((key) => (
            <option key={key} value={key}>
              {key}
            </option>
          ))}
        </select>
        <input type="number" className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800" placeholder="Priority" value={form.priority} onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })} />
        <p className="md:col-span-2 text-xs text-slate-500">
          API secrets stay in server environment variables (GODADDY_PAT, HOSTINGER_API_TOKEN). Affiliate links for GoDaddy and Hostinger are managed under Affiliates.
        </p>
        <Button type="submit">Save provider</Button>
      </form>
    </div>
  );
}
