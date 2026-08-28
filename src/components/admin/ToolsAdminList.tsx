"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Copy, Edit2, Eye, Globe, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DeleteConfirmButton } from "@/components/admin/DeleteConfirmButton";
import { deleteTool, duplicateTool, setToolFeatured, updateToolStatus } from "@/lib/tool-actions";

type ToolRow = {
  id: string;
  name: string;
  slug: string;
  status: string;
  isFeatured: boolean;
  isPublic: boolean;
  sortOrder: number;
  category: { name: string } | null;
};

export function ToolsAdminList({
  tools,
  canUpdate,
  canDelete,
  canCreate,
}: {
  tools: ToolRow[];
  canUpdate: boolean;
  canDelete: boolean;
  canCreate: boolean;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [category, setCategory] = useState("all");

  const categories = useMemo(
    () => [...new Set(tools.map((t) => t.category?.name).filter(Boolean))] as string[],
    [tools]
  );

  const filtered = tools.filter((tool) => {
    if (status !== "all" && tool.status !== status) return false;
    if (category !== "all" && tool.category?.name !== category) return false;
    if (query.trim()) {
      const q = query.toLowerCase();
      if (!`${tool.name} ${tool.slug} ${tool.category?.name || ""}`.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search tools"
          className="flex-1 px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white"
        />
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800">
          <option value="all">All statuses</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
          <option value="archived">Archived</option>
        </select>
        <select value={category} onChange={(e) => setCategory(e.target.value)} className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800">
          <option value="all">All categories</option>
          {categories.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </div>

      <div className="glass-card rounded-xl overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-900/50">
              <th className="p-4 text-slate-300">Name</th>
              <th className="p-4 text-slate-300">Category</th>
              <th className="p-4 text-slate-300">Status</th>
              <th className="p-4 text-slate-300">Visibility</th>
              <th className="p-4 text-right text-slate-300">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {filtered.map((tool) => (
              <tr key={tool.id} className="hover:bg-slate-800/20">
                <td className="p-4">
                  <div className="font-medium text-white flex items-center gap-2">
                    {tool.name}
                    {tool.isFeatured && <Star className="w-3.5 h-3.5 text-indigo-400" />}
                  </div>
                  <div className="text-xs text-slate-500">/{tool.slug}</div>
                </td>
                <td className="p-4 text-slate-400">{tool.category?.name || "—"}</td>
                <td className="p-4">
                  <span
                    className={`inline-flex px-2 py-1 rounded-full text-xs font-medium border ${
                      tool.status === "published"
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        : tool.status === "archived"
                          ? "bg-slate-800 text-slate-400 border-slate-700"
                          : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                    }`}
                  >
                    {tool.status}
                  </span>
                </td>
                <td className="p-4 text-slate-400">{tool.isPublic ? "Public" : "Hidden"}</td>
                <td className="p-4">
                  <div className="flex justify-end gap-1">
                    <Link href={`/free-tools/${tool.slug}`} target="_blank">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400">
                        <Eye className="w-4 h-4" />
                      </Button>
                    </Link>
                    {canUpdate && (
                      <Link href={`/admin/tools/${tool.slug}`}>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400">
                          <Edit2 className="w-4 h-4" />
                        </Button>
                      </Link>
                    )}
                    {canCreate && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-slate-400"
                        onClick={async () => {
                          const copy = await duplicateTool(tool.id);
                          router.push(`/admin/tools/${copy.slug}`);
                          router.refresh();
                        }}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    )}
                    {canUpdate && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-slate-400"
                        title={tool.status === "published" ? "Unpublish" : "Publish"}
                        onClick={async () => {
                          await updateToolStatus(tool.id, tool.status === "published" ? "draft" : "published");
                          router.refresh();
                        }}
                      >
                        <Globe className="w-4 h-4" />
                      </Button>
                    )}
                    {canUpdate && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-slate-400"
                        onClick={async () => {
                          await setToolFeatured(tool.id, !tool.isFeatured);
                          router.refresh();
                        }}
                      >
                        <Star className={`w-4 h-4 ${tool.isFeatured ? "text-indigo-400" : ""}`} />
                      </Button>
                    )}
                    {canDelete && (
                      <DeleteConfirmButton
                        iconOnly
                        confirmTitle="Delete this tool?"
                        confirmMessage={`"${tool.name}" will be deleted.`}
                        onDelete={async () => {
                          await deleteTool(tool.id);
                          router.refresh();
                        }}
                      />
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <p className="p-12 text-center text-slate-500">No tools match those filters.</p>}
      </div>
    </div>
  );
}
