"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { UserPlus, X, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import type { MembershipRole } from "@prisma/client";

const ROLE_OPTIONS: MembershipRole[] = ["TENANT_ADMIN", "MANAGER", "EDITOR", "AUTHOR", "HR", "EMPLOYEE", "VIEWER"];

interface AddMemberFormProps {
  createAction: (input: { name: string; email: string; role: MembershipRole }) => Promise<{
    tempPassword: string | null;
    error?: string | null;
  }>;
}

export function AddMemberForm({ createAction }: AddMemberFormProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<MembershipRole>("EDITOR");
  const [result, setResult] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const reset = () => {
    setName("");
    setEmail("");
    setRole("EDITOR");
    setResult(null);
    setCopied(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { tempPassword, error } = await createAction({ name, email, role });
      if (error) {
        toast.error(error);
      } else if (tempPassword) {
        setResult(tempPassword);
        router.refresh();
      } else {
        toast.success(`${email} added. They can sign in with their existing password, or use Reset Password if they forgot it.`);
        setOpen(false);
        reset();
        router.refresh();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add member");
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
        <UserPlus className="w-4 h-4" />
        Add Member
      </button>

      {open &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ backgroundColor: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
          >
            <div className="relative w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl p-6">
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
                  <h3 className="text-lg font-bold text-white">Member added</h3>
                  <p className="text-slate-400 text-sm">
                    Share this temporary password with {email}. It will not be shown again.
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
                  <h3 className="text-lg font-bold text-white">Add a member</h3>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1.5">Name</label>
                    <input
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full h-10 bg-slate-950 border border-slate-800 rounded-lg px-3 text-sm text-white focus:border-indigo-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1.5">Email</label>
                    <input
                      required
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full h-10 bg-slate-950 border border-slate-800 rounded-lg px-3 text-sm text-white focus:border-indigo-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1.5">Role</label>
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value as MembershipRole)}
                      className="w-full h-10 bg-slate-950 border border-slate-800 rounded-lg px-3 text-sm text-white focus:border-indigo-500 outline-none"
                    >
                      {ROLE_OPTIONS.map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold transition-colors disabled:opacity-60"
                  >
                    {loading ? "Adding…" : "Add Member"}
                  </button>
                </form>
              )}
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
