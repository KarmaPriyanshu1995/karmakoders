import { getSeoPagesAdmin, getProvidersAdmin } from "@/lib/tool-actions";
import { SeoPagesAdmin } from "@/components/admin/SeoPagesAdmin";

export const dynamic = "force-dynamic";

export default async function AdminSeoPagesPage() {
  const [{ landings, tlds, comparisons }, providers] = await Promise.all([getSeoPagesAdmin(), getProvidersAdmin()]);
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">SEO pages</h2>
        <p className="text-slate-400 mt-1">Search-intent landings, TLD pages, and registrar comparisons. Drafts stay out of the sitemap.</p>
      </div>
      <SeoPagesAdmin
        landings={landings}
        tlds={tlds}
        comparisons={comparisons}
        providers={providers.map((p) => ({ id: p.id, name: p.name }))}
      />
    </div>
  );
}
