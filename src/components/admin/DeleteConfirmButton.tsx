"use client";

import { useState } from "react";
import { Trash2, AlertTriangle, X } from "lucide-react";

interface DeleteConfirmButtonProps {
  /** Server action or async function to call on confirm */
  onDelete: () => Promise<void>;
  /** Label shown inside the button (default: icon only) */
  label?: string;
  /** Title shown in the confirm modal */
  confirmTitle?: string;
  /** Body message shown in the confirm modal */
  confirmMessage?: string;
  /** Extra class names on the trigger button */
  className?: string;
  /** Render as icon-only button (no text) */
  iconOnly?: boolean;
}

export function DeleteConfirmButton({
  onDelete,
  label,
  confirmTitle = "Delete this item?",
  confirmMessage = "This action is permanent and cannot be undone.",
  className = "",
  iconOnly = false,
}: DeleteConfirmButtonProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onDelete();
    } finally {
      setLoading(false);
      setOpen(false);
    }
  };

  return (
    <>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          iconOnly
            ? `p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-md transition-colors ${className}`
            : `flex items-center justify-center gap-2 w-full px-4 py-2 bg-slate-900 hover:bg-rose-950/30 text-slate-400 hover:text-rose-400 text-sm font-semibold rounded-lg border border-slate-800 hover:border-rose-500/20 transition-all ${className}`
        }
      >
        <Trash2 className="w-4 h-4" />
        {!iconOnly && (label ?? "Delete")}
      </button>

      {/* Modal Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
        >
          <div
            className="relative w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl p-6 animate-in"
            style={{ animation: "modalIn 0.18s ease-out" }}
          >
            {/* Close button */}
            <button
              onClick={() => setOpen(false)}
              className="absolute top-4 right-4 p-1 text-slate-500 hover:text-white rounded-md transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Icon */}
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/20 mb-4 mx-auto">
              <AlertTriangle className="w-6 h-6 text-rose-400" />
            </div>

            {/* Title */}
            <h3 className="text-lg font-bold text-white text-center mb-2">
              {confirmTitle}
            </h3>

            {/* Message */}
            <p className="text-slate-400 text-sm text-center mb-6">
              {confirmMessage}
            </p>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => setOpen(false)}
                disabled={loading}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 text-sm font-semibold transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={loading}
                className="flex-1 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-sm font-bold transition-colors shadow-lg shadow-rose-900/40 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? "Deleting…" : "Yes, Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.94) translateY(8px); }
          to   { opacity: 1; transform: scale(1)    translateY(0);    }
        }
      `}</style>
    </>
  );
}
