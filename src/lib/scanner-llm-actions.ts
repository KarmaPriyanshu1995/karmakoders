"use server";

import { revalidatePath } from "next/cache";
import { requireSuperAdmin } from "@/lib/tenant-context";
import { AUDIT_ACTIONS, logAudit } from "@/lib/audit";
import { getSql } from "@/lib/scanner/db";

// The scanner's LLM choice lives in its Neon DB (llm_settings, one row, id = 1),
// which the Python worker reads at the start of every scan. API keys are never
// stored there — only whether each key is present in this deployment's env.

export type ScannerLlmProvider = "auto" | "openrouter" | "groq" | "anthropic" | "none";
export type ClaudeEffort = "low" | "medium" | "high" | "xhigh" | "max";

const PROVIDERS: readonly ScannerLlmProvider[] = ["auto", "openrouter", "groq", "anthropic", "none"];
const EFFORTS: readonly ClaudeEffort[] = ["low", "medium", "high", "xhigh", "max"];

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

type Row = {
  enabled: boolean | null;
  provider: string | null;
  openrouter_model: string | null;
  groq_model: string | null;
  anthropic_model: string | null;
  anthropic_effort: string | null;
  fallbacks_enabled: boolean | null;
  updated_by: string | null;
  updated_at: string;
};

function envDefaults(): ScannerLlmState["env"] {
  const env = process.env;
  return {
    provider: (env.LLM_PROVIDER || "auto").toLowerCase(),
    enabled: !["0", "false", "no", "off"].includes((env.LLM_ENABLED || "true").toLowerCase()),
    openrouterModel: env.OPENROUTER_MODEL || env.LLM_MODEL || "google/gemma-4-31b-it",
    groqModel: env.GROQ_MODEL || env.LLM_MODEL || "llama-3.1-8b-instant",
    anthropicModel: env.ANTHROPIC_MODEL || env.LLM_MODEL || "claude-opus-5-5",
    anthropicEffort: env.ANTHROPIC_EFFORT || "low",
    keys: {
      openrouter: Boolean(env.OPENROUTER_API_KEY?.trim()),
      groq: Boolean(env.GROQ_API_KEY?.trim()),
      anthropic: Boolean(env.ANTHROPIC_API_KEY?.trim()),
    },
  };
}

async function readState(): Promise<ScannerLlmState> {
  const rows = (await getSql()`
    SELECT enabled, provider, openrouter_model, groq_model, anthropic_model,
           anthropic_effort, fallbacks_enabled, updated_by, updated_at
    FROM llm_settings WHERE id = 1
  `) as Row[];
  const row = rows[0];
  return {
    overrides: row
      ? {
          enabled: row.enabled ?? undefined,
          provider: (row.provider ?? undefined) as ScannerLlmProvider | undefined,
          openrouterModel: row.openrouter_model ?? undefined,
          groqModel: row.groq_model ?? undefined,
          anthropicModel: row.anthropic_model ?? undefined,
          anthropicEffort: (row.anthropic_effort ?? undefined) as ClaudeEffort | undefined,
          fallbacksEnabled: row.fallbacks_enabled ?? undefined,
          updatedBy: row.updated_by,
          updatedAt: String(row.updated_at),
        }
      : null,
    env: envDefaults(),
  };
}

function cleanModel(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const v = value.trim();
  if (!v) return null;
  if (v.length > 200 || !/^[\w.:/@-]+$/.test(v)) throw new Error(`Invalid model id: ${v}`);
  return v;
}

function dbError(err: unknown): string {
  console.error("[scanner-llm] database error", err);
  return "Could not reach the scanner database. Check SCANNER_DATABASE_URL and run the scanner migrations.";
}

export async function getScannerLlmSettings(): Promise<Result<ScannerLlmState>> {
  await requireSuperAdmin();
  try {
    return { data: await readState() };
  } catch (err) {
    return { error: dbError(err) };
  }
}

export async function saveScannerLlmSettings(input: ScannerLlmInput): Promise<Result<ScannerLlmState>> {
  const user = await requireSuperAdmin();
  if (!PROVIDERS.includes(input.provider)) return { error: "Unknown provider." };
  if (!EFFORTS.includes(input.anthropicEffort)) return { error: "Unknown Claude effort level." };
  let openrouterModel: string | null, groqModel: string | null, anthropicModel: string | null;
  try {
    openrouterModel = cleanModel(input.openrouterModel);
    groqModel = cleanModel(input.groqModel);
    anthropicModel = cleanModel(input.anthropicModel);
  } catch (err) {
    return { error: (err as Error).message };
  }

  try {
    await getSql()`
      INSERT INTO llm_settings (
        id, enabled, provider, openrouter_model, groq_model, anthropic_model,
        anthropic_effort, fallbacks_enabled, updated_by, updated_at
      ) VALUES (
        1, ${input.enabled !== false}, ${input.provider}, ${openrouterModel}, ${groqModel},
        ${anthropicModel}, ${input.anthropicEffort}, ${input.fallbacksEnabled !== false},
        ${user.email.slice(0, 200)}, now()
      )
      ON CONFLICT (id) DO UPDATE SET
        enabled = EXCLUDED.enabled,
        provider = EXCLUDED.provider,
        openrouter_model = EXCLUDED.openrouter_model,
        groq_model = EXCLUDED.groq_model,
        anthropic_model = EXCLUDED.anthropic_model,
        anthropic_effort = EXCLUDED.anthropic_effort,
        fallbacks_enabled = EXCLUDED.fallbacks_enabled,
        updated_by = EXCLUDED.updated_by,
        updated_at = now()
    `;
    const data = await readState();
    await logAudit({
      userId: user.id,
      action: AUDIT_ACTIONS.SETTINGS_UPDATED,
      resource: "scanner_llm",
      metadata: { provider: input.provider, enabled: input.enabled, anthropicModel },
    });
    revalidatePath("/admin/platform/ai-provider");
    return { data };
  } catch (err) {
    return { error: dbError(err) };
  }
}

export async function resetScannerLlmSettings(): Promise<Result<ScannerLlmState>> {
  const user = await requireSuperAdmin();
  try {
    // Drop overrides so the worker goes back to env-only behaviour.
    await getSql()`DELETE FROM llm_settings WHERE id = 1`;
    const data = await readState();
    await logAudit({ userId: user.id, action: AUDIT_ACTIONS.SETTINGS_UPDATED, resource: "scanner_llm", metadata: { reset: true } });
    revalidatePath("/admin/platform/ai-provider");
    return { data };
  } catch (err) {
    return { error: dbError(err) };
  }
}
