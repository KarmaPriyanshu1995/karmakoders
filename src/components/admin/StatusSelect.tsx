"use client";

import { updateApplicationStatus } from "@/lib/actions";
import { useState } from "react";
import { toast } from "sonner";

export function StatusSelect({ id, initialStatus }: { id: string; initialStatus: string }) {
  const [status, setStatus] = useState(initialStatus);
  const [loading, setLoading] = useState(false);

  const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value;
    setLoading(true);
    try {
      await updateApplicationStatus(id, newStatus);
      setStatus(newStatus);
      toast.success(`Status updated to ${newStatus}`);
    } catch (error) {
      console.error(error);
      toast.error("Failed to update status");
    }
    setLoading(false);
  };

  return (
    <div className="relative">
      <select
        value={status}
        disabled={loading}
        onChange={handleChange}
        className={`w-full text-sm font-medium p-2 pr-8 rounded-lg border outline-none appearance-none cursor-pointer transition-all disabled:opacity-50
          ${status === 'Pending' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : ''}
          ${status === 'Reviewed' ? 'bg-blue-500/10 text-blue-450 border-blue-500/20' : ''}
          ${status === 'Interview' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' : ''}
          ${status === 'Hired' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : ''}
          ${status === 'Rejected' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : ''}
        `}
      >
        <option value="Pending" className="bg-slate-950 text-white">Pending</option>
        <option value="Reviewed" className="bg-slate-955 text-white">Reviewed</option>
        <option value="Interview" className="bg-slate-950 text-white">Interview</option>
        <option value="Hired" className="bg-slate-950 text-white">Hired</option>
        <option value="Rejected" className="bg-slate-950 text-white">Rejected</option>
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
        <svg className="fill-current h-4 w-4 opacity-50" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
          <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
        </svg>
      </div>
    </div>
  );
}
