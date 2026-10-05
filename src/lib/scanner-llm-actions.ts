"use server";

import { revalidatePath } from "next/cache";
import { requireSuperAdmin } from "@/lib/tenant-context";
import { AUDIT_ACTIONS, logAudit } from "@/lib/audit";

// The scanner (web/ + engine/) lives on its own Neon DB, so the admin panel
// talks to it through its secret-protected internal route instead of Prisma.

export type ScannerLlmProvider = "auto" | "openrouter" | "groq" | "anthropic" | "none";
export type ClaudeEffort = "low" | "medium" | "high" | "xhigh" | "max";

export interface ScannerLlmInput {
  enabled: boolean;
  provider: ScannerLlmProvider;
  openrouterModel: string;
  groqModel: string;
  anthropicModel: string;
  anthropicEffort: ClaudeEffort;
  fallbacksEnabled: boolean;
}

export interface ScannerLlmState {
  overrides: (Partial<ScannerLlmInput> & { updatedBy?: string | null; updatedAt?: string }) | null;
  env: {
    provider: string;
    enabled: boolean;
    openrouterModel: string;
    groqModel: string;
    anthropicModel: string;
    anthropicEffort: string;
    keys: { openrouter: boolean; groq: boolean; anthropic: boolean };
  };
}

type Result<T> = { data: T; error?: undefined } | { data?: undefined; error: string };

function scannerConfig(): { url: string; secret: string } | null {
  const base = process.env.SCANNER_APP_URL || process.env.NEXT_PUBLIC_SCANNER_URL || "";
  const secret = process.env.SCANNER_ADMIN_SECRET || "";
  if (!base || !secret) return null;
  return { url: `${base.replace(/\/$/, "")}/api/internal/llm-settings`, secret };
}

async function callScanner(method: "GET" | "PUT" | "DELETE", body?: unknown): Promise<Result<ScannerLlmState>> {
  const cfg = scannerConfig();
  if (!cfg) {
    return { error: "Set SCANNER_APP_URL and SCANNER_ADMIN_SECRET in the main site's env (same secret as the scanner's)." };
  }
  try {
    const res = await fetch(cfg.url, {
      method,
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${cfg.secret}`,
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const json = (await res.json().catch(() => ({}))) as ScannerLlmState & { error?: string };
    if (!res.ok) return { error: json.error || `Scanner responded ${res.status}` };
    return { data: json };
  } catch (err) {
    return { error: `Could not reach scanner at ${cfg.url}: ${String(err)}` };
  }
}

export async function getScannerLlmSettings(): Promise<Result<ScannerLlmState>> {
  await requireSuperAdmin();
  return callScanner("GET");
}

export async function saveScannerLlmSettings(input: ScannerLlmInput): Promise<Result<ScannerLlmState>> {
  const user = await requireSuperAdmin();
  const result = await callScanner("PUT", { ...input, updatedBy: user.email });
  if (!result.error) {
    await logAudit({
      userId: user.id,
      action: AUDIT_ACTIONS.SETTINGS_UPDATED,
      resource: "scanner_llm",
      metadata: { provider: input.provider, enabled: input.enabled, anthropicModel: input.anthropicModel },
    });
    revalidatePath("/admin/platform/ai-provider");
  }
  return result;
}

export async function resetScannerLlmSettings(): Promise<Result<ScannerLlmState>> {
  const user = await requireSuperAdmin();
  const result = await callScanner("DELETE");
  if (!result.error) {
    await logAudit({ userId: user.id, action: AUDIT_ACTIONS.SETTINGS_UPDATED, resource: "scanner_llm", metadata: { reset: true } });
    revalidatePath("/admin/platform/ai-provider");
  }
  return result;
}
