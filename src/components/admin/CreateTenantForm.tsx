"use client";

import { useState } from "react";
import { Building2, X, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { createTenant } from "@/lib/membership-actions";

export function CreateTenantForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", slug: "", email: "", adminName: "", adminEmail: "" });
  const [result, setResult] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const reset = () => {
    setForm({ name: "", slug: "", email: "", adminName: "", adminEmail: "" });
    setResult(null);
    setCopied(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { tempPassword, error } = await createTenant(form);
      if (error) {
        toast.error(error);
      } else if (tempPassword) {
        setResult(tempPassword);
        router.refresh();
      } else {
        toast.success("Tenant created. The admin can sign in with their existing password.");
        setOpen(false);
        reset();
        router.refresh();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create tenant");
    }
    setLoading(false);
  };

  const copyPassword = async () => {
    if (!result) return;
    await navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-full transition-all"
      >
        <Building2 className="w-4 h-4" />
        New Tenant
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
        >
          <div className="relative w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => {
                setOpen(false);
                reset();
              }}
              className="absolute top-4 right-4 p-1 text-slate-500 hover:text-white rounded-md transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            {result ? (
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-white">Tenant created</h3>
                <p className="text-slate-400 text-sm">
                  Share this temporary password with {form.adminEmail}. It will not be shown again.
                </p>
                <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5">
                  <code className="flex-1 text-indigo-300 text-sm font-mono break-all">{result}</code>
                  <button onClick={copyPassword} className="text-slate-400 hover:text-white shrink-0">
                    {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <button
                  onClick={() => {
                    setOpen(false);
                    reset();
                  }}
                  className="w-full px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold transition-colors"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <h3 className="text-lg font-bold text-white">Create a new tenant</h3>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1.5">Organization Name</label>
                  <input
                    required
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    className="w-full h-10 bg-slate-950 border border-slate-800 rounded-lg px-3 text-sm text-white focus:border-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1.5">Slug (optional)</label>
                  <input
                    value={form.slug}
                    onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                    placeholder="auto-generated from name"
                    className="w-full h-10 bg-slate-950 border border-slate-800 rounded-lg px-3 text-sm text-white focus:border-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1.5">Contact Email (optional)</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    className="w-full h-10 bg-slate-950 border border-slate-800 rounded-lg px-3 text-sm text-white focus:border-indigo-500 outline-none"
                  />
                </div>
                <div className="border-t border-slate-800 pt-4">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1.5">Initial Tenant Admin Name</label>
                  <input
                    required
                    value={form.adminName}
                    onChange={(e) => setForm((f) => ({ ...f, adminName: e.target.value }))}
                    className="w-full h-10 bg-slate-950 border border-slate-800 rounded-lg px-3 text-sm text-white focus:border-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1.5">Initial Tenant Admin Email</label>
                  <input
                    required
                    type="email"
                    value={form.adminEmail}
                    onChange={(e) => setForm((f) => ({ ...f, adminEmail: e.target.value }))}
                    className="w-full h-10 bg-slate-950 border border-slate-800 rounded-lg px-3 text-sm text-white focus:border-indigo-500 outline-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold transition-colors disabled:opacity-60"
                >
                  {loading ? "Creating…" : "Create Tenant"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
