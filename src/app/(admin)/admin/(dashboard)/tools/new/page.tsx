import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ToolEditorForm } from "@/components/admin/ToolEditorForm";
import { getToolCategoriesAdmin, getFreeToolsSettingsAdmin } from "@/lib/tool-actions";

export const dynamic = "force-dynamic";

export default async function NewToolPage() {
  const [categories, settings] = await Promise.all([getToolCategoriesAdmin(), getFreeToolsSettingsAdmin()]);
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/tools">
          <Button variant="ghost" size="icon" className="text-slate-400">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <h2 className="text-2xl font-bold text-white">Add Tool</h2>
      </div>
      <ToolEditorForm
        isNew
        categories={categories}
        settings={settings}
        tool={{
          name: "",
          slug: "",
          shortDescription: "",
          longDescription: "",
          icon: "Globe",
          categoryId: null,
          status: "draft",
          isFeatured: false,
          isPublic: true,
          sortOrder: 0,
          toolUrl: null,
          seoTitle: null,
          seoDescription: null,
          seoKeywords: null,
          canonicalUrl: null,
          ogTitle: null,
          ogDescription: null,
          ogImage: null,
          robots: "index,follow",
          contentJson: null,
        }}
      />
    </div>
  );
}
