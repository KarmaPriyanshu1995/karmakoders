import type { DomainProviderAdapter } from "@/lib/tools/providers/types";
import { godaddyAdapter } from "@/lib/tools/providers/godaddy";
import { namecheapAdapter } from "@/lib/tools/providers/namecheap";
import { porkbunAdapter } from "@/lib/tools/providers/porkbun";

const ADAPTERS: Record<string, DomainProviderAdapter> = {
  [godaddyAdapter.key]: godaddyAdapter,
  [namecheapAdapter.key]: namecheapAdapter,
  [porkbunAdapter.key]: porkbunAdapter,
};

export function getDomainAdapter(adapterKey: string): DomainProviderAdapter | null {
  return ADAPTERS[adapterKey] ?? null;
}

export function listAdapterKeys(): string[] {
  return Object.keys(ADAPTERS);
}
