"use client";

import { useRouter } from "next/navigation";
import { Download, Mail } from "lucide-react";
import { toast } from "sonner";
import { deleteNewsletterSubscriber } from "@/lib/actions";
import { DeleteConfirmButton } from "@/components/admin/DeleteConfirmButton";

export type SubscriberRow = {
  id: string;
  email: string;
  createdAt: string;
};

export function SubscribersList({ subscribers }: { subscribers: SubscriberRow[] }) {
  const router = useRouter();

  function exportCsv() {
    const header = "email,subscribedAt";
    const lines = subscribers.map((row) => `${row.email},${row.createdAt}`);
    const blob = new Blob([[header, ...lines].join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "newsletter-subscribers.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  if (subscribers.length === 0) {
    return (
      <div className="glass-card rounded-xl p-16 text-center">
        <Mail className="w-12 h-12 text-slate-600 mx-auto mb-4" />
        <p className="text-slate-400 text-lg font-medium">No subscribers yet</p>
        <p className="text-slate-600 text-sm mt-2">
          Emails from “Subscribe for updates” and the footer form will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={exportCsv}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-white/10 bg-white/5 text-sm font-semibold text-white hover:border-[#FFC300]/40 hover:text-[#FFC300] transition-colors"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-white/10">
        <table className="w-full text-left">
          <thead className="bg-white/5 text-xs font-bold uppercase tracking-widest text-slate-400">
            <tr>
              <th className="px-5 py-3">Email</th>
              <th className="px-5 py-3">Subscribed</th>
              <th className="px-5 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {subscribers.map((subscriber) => (
              <tr key={subscriber.id} className="border-t border-white/5 hover:bg-white/[0.03]">
                <td className="px-5 py-4">
                  <a href={`mailto:${subscriber.email}`} className="text-white font-medium hover:text-[#FFC300]">
                    {subscriber.email}
                  </a>
                </td>
                <td className="px-5 py-4 text-sm text-slate-400 whitespace-nowrap">
                  {new Date(subscriber.createdAt).toLocaleString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </td>
                <td className="px-5 py-4">
                  <div className="flex justify-end">
                    <DeleteConfirmButton
                      iconOnly
                      confirmTitle="Remove this subscriber?"
                      confirmMessage={`${subscriber.email} will be removed from the newsletter list.`}
                      onDelete={async () => {
                        await deleteNewsletterSubscriber(subscriber.id);
                        toast.success("Subscriber removed");
                        router.refresh();
                      }}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
