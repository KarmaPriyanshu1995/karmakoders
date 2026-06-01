
import { upsertProject, deleteProject } from "@/lib/actions";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ImagePreview } from "@/components/admin/ImagePreview";
import { ArrowLeft, Save, Globe, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { redirect } from "next/navigation";
import { DeleteConfirmButton } from "@/components/admin/DeleteConfirmButton";

export const dynamic = "force-dynamic";

export default async function AdminProjectEditor({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const isNew = id === "new";
  const project = isNew 
    ? { title: "", slug: "", description: "", imageUrl: "", content: "", link: "", tags: "" }
    : await prisma.project.findUnique({ where: { id: id } });

  if (!project && !isNew) {
    redirect("/admin/projects");
  }

  async function action(formData: FormData) {
    "use server";
    const data = {
      id: isNew ? undefined : id,
      title: formData.get("title") as string,
      slug: formData.get("slug") as string,
      description: formData.get("description") as string,
      imageUrl: formData.get("imageUrl") as string,
      content: formData.get("content") as string,
      link: formData.get("link") as string,
      tags: formData.get("tags") as string,
    };
    await upsertProject(data);
    redirect("/admin/projects");
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/projects">
            <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h2 className="text-2xl font-bold text-white tracking-tight">
              {isNew ? "Add New Project" : "Edit Project"}
            </h2>
          </div>
        </div>
      </div>

      <form action={action} className="space-y-8">
        <div className="glass-card rounded-xl p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300 ml-1">Project Title</label>
              <input
                name="title"
                required
                defaultValue={project?.title}
                placeholder="e.g. Quantum Pay"
                className="w-full h-12 bg-slate-950 border border-slate-800 rounded-xl px-4 text-white focus:border-indigo-500 outline-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300 ml-1">Slug</label>
              <input
                name="slug"
                required
                defaultValue={project?.slug}
                placeholder="e.g. quantum-pay"
                className="w-full h-12 bg-slate-950 border border-slate-800 rounded-xl px-4 text-white focus:border-indigo-500 outline-none"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300 ml-1 flex items-center gap-2">
              <Tag className="w-4 h-4" /> Tech Stack (Comma separated)
            </label>
            <input
              name="tags"
              required
              defaultValue={project?.tags}
              placeholder="e.g. Next.js, TailwindCSS, Prisma"
              className="w-full h-12 bg-slate-950 border border-slate-800 rounded-xl px-4 text-white focus:border-indigo-500 outline-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300 ml-1 flex items-center gap-2">
                <Globe className="w-4 h-4" /> Live Link
              </label>
              <input
                name="link"
                defaultValue={project?.link || ""}
                placeholder="https://..."
                className="w-full h-12 bg-slate-950 border border-slate-800 rounded-xl px-4 text-white focus:border-indigo-500 outline-none"
              />
            </div>
            <ImagePreview initialUrl={project?.imageUrl} name="imageUrl" />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300 ml-1">Short Description</label>
            <textarea
              name="description"
              required
              rows={2}
              defaultValue={project?.description}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white focus:border-indigo-500 outline-none resize-none"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300 ml-1">Full Overview & Case Study</label>
            <textarea
              name="content"
              required
              rows={10}
              defaultValue={project?.content}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white focus:border-indigo-500 outline-none resize-none font-mono text-sm"
            />
          </div>
        </div>

        <div className="flex justify-end gap-4">
          {!isNew && (
            <DeleteConfirmButton
              label="Delete Project"
              confirmTitle="Delete this project?"
              confirmMessage={`"${project?.title}" will be permanently deleted and removed from the portfolio.`}
              onDelete={async () => {
                "use server";
                await deleteProject(id);
                redirect("/admin/projects");
              }}
              className="px-6 h-12 text-sm"
            />
          )}
          <Button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 h-12 shadow-[0_0_20px_rgba(79,70,229,0.4)] font-bold">
            <Save className="w-4 h-4 mr-2" />
            Save Project
          </Button>
        </div>
      </form>
    </div>
  );
}
