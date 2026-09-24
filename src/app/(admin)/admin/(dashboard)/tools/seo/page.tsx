import Link from "next/link";
import { getToolsAdmin } from "@/lib/tool-actions";
import { toolSeoScore } from "@/lib/tools/content";

export const dynamic = "force-dynamic";

export default async function ToolSeoManagerPage() {
  const { tools } = await getToolsAdmin();

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-white">SEO manager</h2>
        <p className="text-slate-400 mt-1 max-w-3xl">
          Titles, social cards, headings, FAQs, and schema are edited per tool and published without a code deploy. The XML sitemap at /sitemap.xml already includes every published tool.
        </p>
      </div>
      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full text-sm">
          <thead className="bg-white/[0.03] text-left text-xs uppercase tracking-widest text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Tool</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Score</th>
              <th className="px-4 py-3 font-medium">Gaps</th>
              <th className="px-4 py-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {tools.map((tool) => {
              const health = toolSeoScore(tool);
              return (
                <tr key={tool.id} className="border-t border-white/5">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-white">{tool.name}</p>
                    <p className="text-slate-500">/free-tools/{tool.slug}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-300">{tool.status}</td>
                  <td className="px-4 py-3 text-white font-bold">{health.score}</td>
                  <td className="px-4 py-3 text-slate-400">{health.missing.slice(0, 3).join(", ") || "Complete"}</td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/admin/tools/${tool.slug}?tab=SEO`} className="text-[#FFC300] font-semibold">
                      Edit SEO
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
