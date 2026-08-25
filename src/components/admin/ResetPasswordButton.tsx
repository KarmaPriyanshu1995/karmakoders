"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { KeyRound, X, Copy, Check } from "lucide-react";
import { toast } from "sonner";

interface ResetPasswordButtonProps {
  email: string;
  action: (membershipId: string) => Promise<{ tempPassword: string | null; error?: string | null }>;
  membershipId: string;
}

export function ResetPasswordButton({ email, action, membershipId }: ResetPasswordButtonProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const close = () => {
    setOpen(false);
    setResult(null);
    setCopied(false);
  };

  const handleReset = async () => {
    setLoading(true);
    try {
      const { tempPassword, error } = await action(membershipId);
      if (error) {
        toast.error(error);
      } else if (tempPassword) {
        setResult(tempPassword);
      } else {
        toast.error("Failed to reset password");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to reset password");
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
        type="button"
        onClick={() => setOpen(true)}
        title="Reset password"
        className="p-2 text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-full transition-colors"
      >
        <KeyRound className="w-4 h-4" />
      </button>

      {open &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ backgroundColor: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
          >
            <div className="relative w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl p-6">
              <button onClick={close} className="absolute top-4 right-4 p-1 text-slate-500 hover:text-white rounded-md transition-colors">
                <X className="w-4 h-4" />
              </button>

              {result ? (
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-white">Password reset</h3>
                  <p className="text-slate-400 text-sm">
                    Share this new temporary password with {email}. It will not be shown again.
                  </p>
                  <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5">
                    <code className="flex-1 text-indigo-300 text-sm font-mono break-all">{result}</code>
                    <button onClick={copyPassword} className="text-slate-400 hover:text-white shrink-0">
                      {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                  <button
                    onClick={close}
                    className="w-full px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold transition-colors"
                  >
                    Done
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-white">Reset password?</h3>
                  <p className="text-slate-400 text-sm">
                    This generates a new temporary password for {email} and invalidates their current one.
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={close}
                      className="flex-1 px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-sm font-bold transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleReset}
                      disabled={loading}
                      className="flex-1 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold transition-colors disabled:opacity-60"
                    >
                      {loading ? "Resetting…" : "Reset"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
