import { getProjects } from "@/lib/actions";
import Link from "next/link";
import { Edit2, Briefcase, Plus, Trash2, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function AdminProjectList() {
  const projects = await getProjects();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Projects & Case Studies</h2>
          <p className="text-slate-400 mt-1">Manage your portfolio and dynamic project showcases.</p>
        </div>
        <Link href="/admin/projects/new">
          <Button className="bg-indigo-600 hover:bg-indigo-500 text-white">
            <Plus className="w-4 h-4 mr-2" />
            New Project
          </Button>
        </Link>
      </div>

      <div className="glass-card rounded-xl overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-900/50">
              <th className="p-4 font-medium text-slate-300">Project</th>
              <th className="p-4 font-medium text-slate-300">Tags</th>
              <th className="p-4 font-medium text-slate-300">Created At</th>
              <th className="p-4 font-medium text-slate-300 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {projects.map((project) => (
              <tr key={project.id} className="hover:bg-slate-800/20 transition-colors">
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <img src={project.imageUrl} className="w-10 h-10 rounded object-cover border border-slate-700" alt="" />
                    <span className="font-medium text-white">{project.title}</span>
                  </div>
                </td>
                <td className="p-4">
                  <div className="flex flex-wrap gap-1">
                    {project.tags.split(',').map(tag => (
                      <span key={tag} className="text-[10px] font-bold uppercase tracking-widest text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                        {tag.trim()}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="p-4 text-slate-400 text-sm">
                  {new Date(project.createdAt).toLocaleDateString()}
                </td>
                <td className="p-4 text-right">
                  <div className="flex justify-end gap-2">
                    <Link href={`/portfolio/${project.slug}`} target="_blank">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-indigo-400">
                        <Eye className="w-4 h-4" />
                      </Button>
                    </Link>
                    <Link href={`/admin/projects/${project.id}`}>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-indigo-400">
                        <Edit2 className="w-4 h-4" />
                      </Button>
                    </Link>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-rose-400">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {projects.length === 0 && (
          <div className="p-12 text-center text-slate-500">
            No projects found. Showcase your work!
          </div>
        )}
      </div>
    </div>
  );
}
