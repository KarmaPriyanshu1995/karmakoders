import { getJobApplications } from "@/lib/actions";
import { Download, ExternalLink, Briefcase, Mail, Phone, ChevronLeft } from "lucide-react";
import Link from "next/link";
import { DeleteApplicationButton } from "@/components/admin/DeleteApplicationButton";
import { StatusSelect } from "@/components/admin/StatusSelect";

export default async function AdminApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<{ jobId?: string }>;
}) {
  const { jobId } = await searchParams;
  const applications = await getJobApplications(jobId);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/careers" className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <div>
          <h2 className="text-2xl font-bold text-white">Job Applications</h2>
          <p className="text-slate-400 mt-1">Review candidate enrollments and download CVs.</p>
        </div>
      </div>

      <div className="glass-card rounded-xl border border-slate-800 overflow-hidden">
        {applications.length === 0 ? (
          <div className="p-8 text-center text-slate-400">
            No applications received yet.
          </div>
        ) : (
          <div className="divide-y divide-slate-800/50">
            {applications.map((app) => (
              <div key={app.id} className="p-6 flex flex-col md:flex-row gap-6 items-start justify-between hover:bg-slate-800/20 transition-colors">
                
                {/* Candidate Info */}
                <div className="flex-1 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-white">{app.name}</h3>
                      <div className="flex items-center gap-2 text-sm text-indigo-400 font-medium">
                        <Briefcase className="w-4 h-4" />
                        Applied for: {app.job.title}
                      </div>
                    </div>
                    <div className="text-right text-xs text-slate-500">
                      {new Date(app.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-4 text-sm text-slate-300">
                    <a href={`mailto:${app.email}`} className="flex items-center gap-1 hover:text-white"><Mail className="w-4 h-4" /> {app.email}</a>
                    {app.phone && <a href={`tel:${app.phone}`} className="flex items-center gap-1 hover:text-white"><Phone className="w-4 h-4" /> {app.phone}</a>}
                    {app.portfolio && (
                      <a href={app.portfolio} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300">
                        <ExternalLink className="w-4 h-4" /> Portfolio
                      </a>
                    )}
                  </div>

                  {app.coverLetter && (
                    <div className="bg-slate-900/50 p-4 rounded-lg text-sm text-slate-400 italic border border-slate-800 border-l-4 border-l-indigo-500">
                      "{app.coverLetter}"
                    </div>
                  )}
                </div>

                {/* Actions & Status */}
                <div className="flex flex-col gap-3 min-w-[200px] border-l border-slate-800 pl-6">
                  <a
                    href={app.cvUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-lg transition-colors shadow-lg"
                  >
                    <Download className="w-4 h-4" />
                    Download CV
                  </a>

                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 block">Status</label>
                    <StatusSelect id={app.id} initialStatus={app.status} />
                  </div>

                  <div className="pt-1 border-t border-slate-800/40">
                    <DeleteApplicationButton id={app.id} />
                  </div>
                </div>

              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
