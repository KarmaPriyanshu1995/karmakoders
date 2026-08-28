import { getToolCategoriesAdmin } from "@/lib/tool-actions";
import { CategoriesAdmin } from "@/components/admin/CategoriesAdmin";

export const dynamic = "force-dynamic";

export default async function ToolCategoriesPage() {
  const categories = await getToolCategoriesAdmin();
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">Tool categories</h2>
        <p className="text-slate-400 mt-1">Used to filter the public Free Tools catalog.</p>
      </div>
      <CategoriesAdmin categories={categories} />
    </div>
  );
}
