import { NextResponse } from "next/server";
import { getSql } from "@/lib/db";

export const dynamic = "force-dynamic";

// Admin panel (main site) reads/writes the worker's LLM provider choice here.
// API keys never pass through this route — only whether each one is configured.

const PROVIDERS = ["auto", "openrouter", "groq", "anthropic", "none"] as const;
const EFFORTS = ["low", "medium", "high", "xhigh", "max"] as const;

function noStore(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0" },
  });
}

function authorize(request: Request): NextResponse | null {
  const secret = process.env.SCANNER_ADMIN_SECRET || "";
  if (!secret) {
    return noStore({ error: "SCANNER_ADMIN_SECRET is not configured." }, 503);
  }
  const header = request.headers.get("authorization") || "";
  const bearer = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (bearer !== secret) {
    return noStore({ error: "Unauthorized." }, 401);
  }
  return null;
}

function envDefaults() {
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

async function readRow(): Promise<Row | null> {
  const rows = (await getSql()`
    SELECT enabled, provider, openrouter_model, groq_model, anthropic_model,
           anthropic_effort, fallbacks_enabled, updated_by, updated_at
    FROM llm_settings WHERE id = 1
  `) as Row[];
  return rows[0] ?? null;
}

function toPayload(row: Row | null) {
  return {
    overrides: row
      ? {
          enabled: row.enabled,
          provider: row.provider,
          openrouterModel: row.openrouter_model,
          groqModel: row.groq_model,
          anthropicModel: row.anthropic_model,
          anthropicEffort: row.anthropic_effort,
          fallbacksEnabled: row.fallbacks_enabled,
          updatedBy: row.updated_by,
          updatedAt: row.updated_at,
        }
      : null,
    env: envDefaults(),
  };
}

export async function GET(request: Request) {
  const denied = authorize(request);
  if (denied) return denied;
  try {
    return noStore(toPayload(await readRow()));
  } catch (err) {
    return noStore({ error: "Could not read llm_settings. Run `npm run migrate`.", detail: String(err) }, 500);
  }
}

function cleanModel(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const v = value.trim();
  if (!v) return null;
  if (v.length > 200 || !/^[\w.:/@-]+$/.test(v)) throw new Error(`Invalid model id: ${v}`);
  return v;
}

export async function PUT(request: Request) {
  const denied = authorize(request);
  if (denied) return denied;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return noStore({ error: "Invalid JSON body." }, 400);
  }

  const provider = String(body.provider ?? "auto");
  if (!(PROVIDERS as readonly string[]).includes(provider)) {
    return noStore({ error: `provider must be one of ${PROVIDERS.join(", ")}` }, 400);
  }
  const effort = String(body.anthropicEffort ?? "low");
  if (!(EFFORTS as readonly string[]).includes(effort)) {
    return noStore({ error: `anthropicEffort must be one of ${EFFORTS.join(", ")}` }, 400);
  }

  let openrouterModel: string | null, groqModel: string | null, anthropicModel: string | null;
  try {
    openrouterModel = cleanModel(body.openrouterModel);
    groqModel = cleanModel(body.groqModel);
    anthropicModel = cleanModel(body.anthropicModel);
  } catch (err) {
    return noStore({ error: (err as Error).message }, 400);
  }

  const enabled = body.enabled !== false;
  const fallbacksEnabled = body.fallbacksEnabled !== false;
  const updatedBy = typeof body.updatedBy === "string" ? body.updatedBy.slice(0, 200) : null;

  try {
    await getSql()`
      INSERT INTO llm_settings (
        id, enabled, provider, openrouter_model, groq_model, anthropic_model,
        anthropic_effort, fallbacks_enabled, updated_by, updated_at
      ) VALUES (
        1, ${enabled}, ${provider}, ${openrouterModel}, ${groqModel}, ${anthropicModel},
        ${effort}, ${fallbacksEnabled}, ${updatedBy}, now()
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
    return noStore(toPayload(await readRow()));
  } catch (err) {
    return noStore({ error: "Could not save llm_settings. Run `npm run migrate`.", detail: String(err) }, 500);
  }
}

export async function DELETE(request: Request) {
  const denied = authorize(request);
  if (denied) return denied;
  // Reset: drop overrides so the worker goes back to env-only behaviour.
  await getSql()`DELETE FROM llm_settings WHERE id = 1`;
  return noStore(toPayload(null));
}
