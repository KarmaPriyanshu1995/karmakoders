"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { ShieldCheck, X } from "lucide-react";
import { toast } from "sonner";
import type { MembershipRole } from "@prisma/client";
import {
  SECTIONS,
  buildPermissionOverrides,
  readSectionSelection,
  canViewSection,
  type PermissionOverrides,
  type SectionKey,
} from "@/lib/permissions";

type SectionChoice = "show" | "hide" | null;

interface MemberPermissionsButtonProps {
  email: string;
  role: MembershipRole;
  membershipId: string;
  permissionOverrides: PermissionOverrides | null;
  action: (membershipId: string, overrides: PermissionOverrides) => Promise<unknown>;
}

const SECTION_KEYS = Object.keys(SECTIONS) as SectionKey[];

export function MemberPermissionsButton({ email, role, membershipId, permissionOverrides, action }: MemberPermissionsButtonProps) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selection, setSelection] = useState<Partial<Record<SectionKey, SectionChoice>>>(() =>
    readSectionSelection(permissionOverrides)
  );

  const openModal = () => {
    setSelection(readSectionSelection(permissionOverrides));
    setOpen(true);
  };

  const cycle = (key: SectionKey) => {
    setSelection((prev) => {
      const current = prev[key] ?? null;
      const next: SectionChoice = current === null ? "show" : current === "show" ? "hide" : null;
      return { ...prev, [key]: next };
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const result = (await action(membershipId, buildPermissionOverrides(selection))) as { error?: string | null } | void;
      if (result && typeof result === "object" && result.error) {
        toast.error(result.error);
      } else {
        toast.success(`Permissions updated for ${email}`);
        setOpen(false);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update permissions");
    }
    setSaving(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        title="Section permissions"
        className="p-2 text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-full transition-colors"
      >
        <ShieldCheck className="w-4 h-4" />
      </button>

      {open &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ backgroundColor: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
          >
            <div className="relative w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl p-6">
              <button
                onClick={() => setOpen(false)}
                className="absolute top-4 right-4 p-1 text-slate-500 hover:text-white rounded-md transition-colors"
              >
                <X className="w-4 h-4" />
              </button>

              <h3 className="text-lg font-bold text-white">Section permissions</h3>
              <p className="text-slate-400 text-sm mt-1 mb-4">
                Override which admin sections {email} can see, on top of their <span className="font-semibold text-slate-300">{role}</span> role default.
              </p>

              <div className="space-y-1.5 max-h-[50vh] overflow-y-auto pr-1">
                {SECTION_KEYS.map((key) => {
                  const choice = selection[key] ?? null;
                  const roleDefault = canViewSection(role, key, null);
                  return (
                    <div
                      key={key}
                      className="flex items-center justify-between gap-4 px-3 py-2.5 rounded-lg bg-slate-950 border border-slate-800"
                    >
                      <div>
                        <p className="text-sm font-semibold text-white">{SECTIONS[key].label}</p>
                        <p className="text-xs text-slate-500">
                          Role default: {roleDefault ? "visible" : "hidden"}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => cycle(key)}
                        className={`px-3 py-1.5 text-xs font-bold rounded-full border transition-colors shrink-0 ${
                          choice === "show"
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            : choice === "hide"
                              ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                              : "bg-slate-800/50 text-slate-400 border-slate-700"
                        }`}
                      >
                        {choice === "show" ? "Shown" : choice === "hide" ? "Hidden" : "Default"}
                      </button>
                    </div>
                  );
                })}
              </div>

              <div className="flex gap-3 mt-5">
                <button
                  onClick={() => setOpen(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-sm font-bold transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold transition-colors disabled:opacity-60"
                >
                  {saving ? "Saving…" : "Save"}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
