import { getContactSubmissions } from "@/lib/actions";
import { Mail, Clock } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Inquiries | karmakoders Admin",
};

export default async function InquiriesPage() {
  const submissions = await getContactSubmissions();

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-white">Customer Inquiries</h2>
        <p className="text-slate-400 mt-1">All contact form submissions from your website</p>
      </div>

      {submissions.length === 0 ? (
        <div className="glass-card rounded-xl p-16 text-center">
          <Mail className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400 text-lg font-medium">No inquiries yet</p>
          <p className="text-slate-600 text-sm mt-2">
            Customer messages from the contact form will appear here.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {submissions.map((sub) => (
            <div
              key={sub.id}
              className="glass-card rounded-xl p-6 border border-slate-800 hover:border-indigo-500/40 transition-colors"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold text-sm">
                      {sub.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-white font-semibold">{sub.name}</p>
                      <a
                        href={`mailto:${sub.email}`}
                        className="text-indigo-400 text-sm hover:text-indigo-300 transition-colors"
                      >
                        {sub.email}
                      </a>
                    </div>
                  </div>
                  <p className="text-slate-300 text-sm leading-relaxed bg-slate-800/40 rounded-lg p-4 border border-slate-800">
                    {sub.message}
                  </p>
                </div>
                <div className="flex items-center gap-2 text-slate-500 text-xs whitespace-nowrap">
                  <Clock className="w-3.5 h-3.5" />
                  {new Date(sub.createdAt).toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <a
                  href={`mailto:${sub.email}?subject=Re: Your inquiry&body=Hi ${sub.name},%0D%0A%0D%0AThank you for reaching out!`}
                  className="px-4 py-1.5 text-xs font-semibold bg-indigo-600/20 border border-indigo-500/40 text-indigo-300 rounded-full hover:bg-indigo-600/40 transition-colors"
                >
                  Reply via Email
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="text-slate-600 text-sm">
        Showing {submissions.length} total {submissions.length === 1 ? "inquiry" : "inquiries"}
      </div>
    </div>
  );
}
