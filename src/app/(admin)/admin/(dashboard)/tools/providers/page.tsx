import { getProvidersAdmin } from "@/lib/tool-actions";
import { ProvidersAdmin } from "@/components/admin/ProvidersAdmin";
import { listAdapterKeys } from "@/lib/tools/providers/registry";

export const dynamic = "force-dynamic";

export default async function ProvidersPage() {
  const providers = await getProvidersAdmin();
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">Domain providers</h2>
        <p className="text-slate-400 mt-1">API health, enablement, and affiliate flags. Secrets stay in environment variables.</p>
      </div>
      <ProvidersAdmin providers={providers} adapterKeys={listAdapterKeys()} />
    </div>
  );
}
