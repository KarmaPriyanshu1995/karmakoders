import { getJobs, deleteJob, upsertJob } from "@/lib/actions";
import Link from "next/link";
import { Plus, Building, MapPin, Users, Edit, Trash2, FileText } from "lucide-react";
import { revalidatePath } from "next/cache";

export default async function AdminCareersPage() {
  const jobs = await getJobs();

  async function handleDelete(formData: FormData) {
    "use server";
    await deleteJob(formData.get("id") as string);
    revalidatePath("/admin/careers");
  }

  async function toggleActive(formData: FormData) {
    "use server";
    const id = formData.get("id") as string;
    const isActive = formData.get("isActive") === "true";
    await upsertJob({
      id,
      title: formData.get("title") as string,
      slug: formData.get("slug") as string,
      type: formData.get("type") as string,
      description: formData.get("description") as string,
      isActive: !isActive,
    });
    revalidatePath("/admin/careers");
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white">Careers & Job Openings</h2>
          <p className="text-slate-400 mt-1">Manage active positions and view enrollments.</p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/admin/careers/applications"
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-sm font-semibold rounded-lg transition-colors border border-slate-700"
          >
            <FileText className="w-4 h-4" />
            All Applications
          </Link>
          <Link
            href="/admin/careers/new"
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Post New Job
          </Link>
        </div>
      </div>

      <div className="glass-card rounded-xl border border-slate-800 overflow-hidden">
        {jobs.length === 0 ? (
          <div className="p-8 text-center text-slate-400">
            No job openings created yet.
          </div>
        ) : (
          <div className="divide-y divide-slate-800/50">
            {jobs.map((job) => (
              <div key={job.id} className="p-6 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between hover:bg-slate-800/20 transition-colors">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-bold text-white">{job.title}</h3>
                    <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${job.isActive ? "bg-emerald-500/10 text-emerald-400" : "bg-slate-800 text-slate-400"}`}>
                      {job.isActive ? "Active" : "Closed"}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-slate-400">
                    <span className="flex items-center gap-1"><Building className="w-4 h-4" /> {job.department || "General"}</span>
                    <span className="flex items-center gap-1"><MapPin className="w-4 h-4" /> {job.location || "Remote"}</span>
                    <span className="flex items-center gap-1 text-indigo-400"><Users className="w-4 h-4" /> {job._count.applications} Applicants</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <form action={toggleActive}>
                    <input type="hidden" name="id" value={job.id} />
                    <input type="hidden" name="title" value={job.title} />
                    <input type="hidden" name="slug" value={job.slug} />
                    <input type="hidden" name="type" value={job.type} />
                    <input type="hidden" name="description" value={job.description} />
                    <input type="hidden" name="isActive" value={job.isActive ? "true" : "false"} />
                    <button type="submit" className="px-3 py-1.5 text-xs font-medium rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300">
                      {job.isActive ? "Mark Closed" : "Mark Active"}
                    </button>
                  </form>
                  <Link
                    href={`/admin/careers/${job.id}/edit`}
                    className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition-colors"
                  >
                    <Edit className="w-4 h-4" />
                  </Link>
                  <form action={handleDelete}>
                    <input type="hidden" name="id" value={job.id} />
                    <button type="submit" className="p-2 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-md transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
