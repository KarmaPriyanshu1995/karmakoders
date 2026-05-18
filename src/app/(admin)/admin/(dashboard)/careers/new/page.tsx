"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { upsertJob } from "@/lib/actions";
import { Save, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { RichTextEditor } from "@/components/admin/RichTextEditor";

export default function NewJobPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: "",
    slug: "",
    department: "",
    location: "Remote",
    type: "Full-time",
    description: "",
  });

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const title = e.target.value;
    setForm({
      ...form,
      title,
      slug: title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, ""),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.description) return alert("Description is required");
    
    setLoading(true);
    try {
      await upsertJob({ ...form, isActive: true });
      router.push("/admin/careers");
    } catch (error) {
      console.error(error);
      alert("Failed to create job opening.");
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6 max-w-4xl pb-20">
      <div className="flex items-center gap-4">
        <Link href="/admin/careers" className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h2 className="text-2xl font-bold text-white">Post New Job</h2>
          <p className="text-slate-400">Create a new career opportunity.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="glass-card p-6 rounded-xl border border-slate-800 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-300">Job Title</label>
              <input
                type="text"
                required
                value={form.title}
                onChange={handleTitleChange}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:border-indigo-500 outline-none"
                placeholder="e.g. Senior Frontend Developer"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-300">Slug (URL)</label>
              <input
                type="text"
                required
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:border-indigo-500 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-300">Department</label>
              <input
                type="text"
                value={form.department}
                onChange={(e) => setForm({ ...form, department: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:border-indigo-500 outline-none"
                placeholder="e.g. Engineering"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-300">Location</label>
              <input
                type="text"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:border-indigo-500 outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-300">Job Type</label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:border-indigo-500 outline-none"
              >
                <option value="Full-time">Full-time</option>
                <option value="Part-time">Part-time</option>
                <option value="Contract">Contract</option>
                <option value="Internship">Internship</option>
              </select>
            </div>
          </div>

          <div className="space-y-1 pt-2">
            <label className="text-sm font-medium text-slate-300">Job Description</label>
            <div className="prose-editor-container border border-slate-800 rounded-lg overflow-hidden">
              <RichTextEditor
                content={form.description}
                onChange={(html) => setForm({ ...form, description: html })}
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg transition-all disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {loading ? "Publishing..." : "Publish Job Opening"}
          </button>
        </div>
      </form>
    </div>
  );
}
