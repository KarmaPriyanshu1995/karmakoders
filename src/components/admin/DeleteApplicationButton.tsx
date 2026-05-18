"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { deleteJobApplication } from "@/lib/actions";
import { toast } from "sonner";

export function DeleteApplicationButton({ id }: { id: string }) {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this application? This will permanently delete the candidate's record and remove their CV from cloud storage.")) {
      return;
    }

    setLoading(true);
    try {
      await deleteJobApplication(id);
      toast.success("Application and CV deleted successfully!");
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete application.");
    }
    setLoading(false);
  };

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-slate-900 hover:bg-rose-950/30 text-slate-400 hover:text-rose-400 text-sm font-semibold rounded-lg border border-slate-800 hover:border-rose-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <Trash2 className="w-4 h-4" />
      {loading ? "Deleting..." : "Delete Application"}
    </button>
  );
}
