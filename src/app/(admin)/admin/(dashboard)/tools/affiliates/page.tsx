import { getAffiliateProgramsAdmin, getProvidersAdmin } from "@/lib/tool-actions";
import { AffiliatesAdmin } from "@/components/admin/AffiliatesAdmin";

export const dynamic = "force-dynamic";

export default async function AffiliatesPage() {
  const [programs, providers] = await Promise.all([getAffiliateProgramsAdmin(), getProvidersAdmin()]);
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">Affiliate programs</h2>
        <p className="text-slate-400 mt-1">Tracking URLs are used only through /go/domain-provider/[provider].</p>
      </div>
      <AffiliatesAdmin programs={programs} providers={providers.map((p) => ({ id: p.id, name: p.name }))} />
    </div>
  );
}
