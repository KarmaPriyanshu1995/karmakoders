import { requireSuperAdmin } from "@/lib/tenant-context";
import { getScannerLlmSettings } from "@/lib/scanner-llm-actions";
import { ScannerLlmForm } from "@/components/admin/ScannerLlmForm";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "AI Provider | karmakoders Platform",
};

export default async function ScannerAiProviderPage() {
  await requireSuperAdmin();
  const result = await getScannerLlmSettings();

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-white">Platform · AI Provider</h2>
        <p className="text-slate-400 mt-1">
          Choose which LLM writes security-scanner explanations and fix prompts. Changes apply to the next scan — no
          worker restart needed.
        </p>
      </div>

      {result.data ? (
        <ScannerLlmForm initial={result.data} />
      ) : (
        <div className="glass-card rounded-xl p-6 border border-rose-500/30 text-rose-300 text-sm space-y-2">
          <p className="font-semibold">Scanner settings unavailable</p>
          <p>{result.error}</p>
        </div>
      )}
    </div>
  );
}
