import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ToolEditorForm } from "@/components/admin/ToolEditorForm";
import {
  getToolAdminBySlug,
  getToolCategoriesAdmin,
  getFreeToolsSettingsAdmin,
  getToolsAnalytics,
  getProvidersAdmin,
} from "@/lib/tool-actions";

export const dynamic = "force-dynamic";

export default async function EditToolPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [tool, categories, settings, analytics, providers] = await Promise.all([
    getToolAdminBySlug(slug),
    getToolCategoriesAdmin(),
    getFreeToolsSettingsAdmin(),
    getToolsAnalytics(),
    getProvidersAdmin(),
  ]);
  if (!tool) notFound();

  const extraTabs =
    tool.slug === "domain-compare" ? (
      <div className="grid md:grid-cols-2 gap-6">
        <div className="rounded-xl border border-white/10 p-5 space-y-3">
          <h3 className="font-bold text-white">Overview</h3>
          <p className="text-sm text-slate-400">Published: {tool.status === "published" ? "Yes" : "No"}</p>
          <p className="text-sm text-slate-400">Views: {analytics.views}</p>
          <p className="text-sm text-slate-400">Searches: {analytics.searches}</p>
          <p className="text-sm text-slate-400">Buy clicks: {analytics.buyClicks}</p>
          <p className="text-sm text-slate-400">Affiliate CTR: {analytics.affiliateCtr.toFixed(1)}%</p>
          <Link href="/admin/tools/analytics" className="text-indigo-400 text-sm font-semibold">
            Full analytics →
          </Link>
        </div>
        <div className="rounded-xl border border-white/10 p-5 space-y-3">
          <h3 className="font-bold text-white">Providers</h3>
          {providers.map((p) => (
            <p key={p.id} className="text-sm text-slate-300">
              {p.name} · API {p.apiEnabled ? "on" : "off"} · Affiliate {p.affiliateEnabled ? "on" : "off"}
            </p>
          ))}
          <Link href="/admin/tools/providers" className="text-indigo-400 text-sm font-semibold">
            Manage providers →
          </Link>
          <div className="pt-2">
            <Link href="/admin/tools/affiliates" className="text-indigo-400 text-sm font-semibold">
              Affiliate programs →
            </Link>
          </div>
        </div>
      </div>
    ) : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/tools">
          <Button variant="ghost" size="icon" className="text-slate-400">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h2 className="text-2xl font-bold text-white">{tool.name}</h2>
          <p className="text-slate-500 text-sm">/free-tools/{tool.slug}</p>
        </div>
      </div>
      <ToolEditorForm isNew={false} tool={tool} categories={categories} settings={settings} extraTabs={extraTabs} />
    </div>
  );
}
