"use client";

import { useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Loader2, RotateCcw, Save, XCircle } from "lucide-react";
import {
  resetScannerLlmSettings,
  saveScannerLlmSettings,
  type ClaudeEffort,
  type ScannerLlmInput,
  type ScannerLlmProvider,
  type ScannerLlmState,
} from "@/lib/scanner-llm-actions";

const PROVIDERS: { value: ScannerLlmProvider; label: string; hint: string }[] = [
  { value: "auto", label: "Auto", hint: "First provider with a key: OpenRouter → Groq → Claude" },
  { value: "openrouter", label: "OpenRouter", hint: "Qwen, Gemma and other hosted models" },
  { value: "groq", label: "Groq", hint: "Fast Llama inference" },
  { value: "anthropic", label: "Claude (Anthropic)", hint: "Direct Anthropic API" },
  { value: "none", label: "Off", hint: "Scans run without AI explanations" },
];

const CLAUDE_MODELS = [
  { value: "claude-opus-5-5", label: "Claude Opus 5.5 — most capable Opus" },
  { value: "claude-sonnet-5-5", label: "Claude Sonnet 5.5 — fast, lower cost" },
  { value: "claude-haiku-4-5", label: "Claude Haiku 4.5 — cheapest" },
];

const EFFORTS: ClaudeEffort[] = ["low", "medium", "high", "xhigh", "max"];

const inputCls =
  "w-full rounded-lg bg-slate-900/60 border border-slate-700 px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500";

function toForm(state: ScannerLlmState): ScannerLlmInput {
  const o = state.overrides ?? {};
  const e = state.env;
  return {
    enabled: o.enabled ?? e.enabled,
    provider: (o.provider ?? e.provider ?? "auto") as ScannerLlmProvider,
    openrouterModel: o.openrouterModel ?? e.openrouterModel,
    groqModel: o.groqModel ?? e.groqModel,
    anthropicModel: o.anthropicModel ?? e.anthropicModel,
    anthropicEffort: (o.anthropicEffort ?? e.anthropicEffort ?? "low") as ClaudeEffort,
    fallbacksEnabled: o.fallbacksEnabled ?? true,
  };
}

function KeyBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border ${
        ok
          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
          : "bg-slate-800 text-slate-400 border-slate-700"
      }`}
    >
      {ok ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
      {label} key {ok ? "set" : "missing"}
    </span>
  );
}

export function ScannerLlmForm({ initial }: { initial: ScannerLlmState }) {
  const [state, setState] = useState(initial);
  const [form, setForm] = useState<ScannerLlmInput>(() => toForm(initial));
  const [saving, setSaving] = useState(false);
  const keys = state.env.keys;

  const set = <K extends keyof ScannerLlmInput>(key: K, value: ScannerLlmInput[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const apply = (next: ScannerLlmState) => {
    setState(next);
    setForm(toForm(next));
  };

  const save = async () => {
    setSaving(true);
    const res = await saveScannerLlmSettings(form);
    setSaving(false);
    if (!res.data) return toast.error(res.error ?? "Request failed");
    apply(res.data);
    toast.success("AI provider saved — applies from the next scan");
  };

  const reset = async () => {
    setSaving(true);
    const res = await resetScannerLlmSettings();
    setSaving(false);
    if (!res.data) return toast.error(res.error ?? "Request failed");
    apply(res.data);
    toast.success("Reset to .env defaults");
  };

  const selectedNeedsKey =
    (form.provider === "anthropic" && !keys.anthropic) ||
    (form.provider === "openrouter" && !keys.openrouter) ||
    (form.provider === "groq" && !keys.groq);

  return (
    <div className="space-y-6">
      <div className="glass-card rounded-xl p-6 space-y-4">
        <div className="flex flex-wrap gap-2">
          <KeyBadge ok={keys.openrouter} label="OpenRouter" />
          <KeyBadge ok={keys.groq} label="Groq" />
          <KeyBadge ok={keys.anthropic} label="Anthropic" />
        </div>
        <p className="text-xs text-slate-500">
          Badges show keys set in this website&apos;s environment. The scan worker uses the keys in its own{" "}
          <code>.env</code> on the worker server (never stored in the database) — add{" "}
          <code>ANTHROPIC_API_KEY</code> there once, then switch here anytime.
        </p>
        {state.overrides?.updatedAt && (
          <p className="text-xs text-slate-500">
            Last changed {new Date(state.overrides.updatedAt).toLocaleString()}
            {state.overrides.updatedBy ? ` by ${state.overrides.updatedBy}` : ""}
          </p>
        )}
      </div>

      <div className="glass-card rounded-xl p-6 space-y-6">
        <label className="flex items-center gap-3 text-sm text-white">
          <input
            type="checkbox"
            checked={form.enabled}
            onChange={(e) => set("enabled", e.target.checked)}
            className="w-4 h-4 accent-indigo-500"
          />
          AI explanations enabled
        </label>

        <div>
          <h3 className="text-sm font-semibold text-slate-300 mb-3">Primary provider</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {PROVIDERS.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => set("provider", p.value)}
                className={`text-left rounded-lg border p-3 transition-colors ${
                  form.provider === p.value
                    ? "border-indigo-500 bg-indigo-500/10"
                    : "border-slate-700 hover:border-slate-500"
                }`}
              >
                <p className="text-sm font-medium text-white">{p.label}</p>
                <p className="text-xs text-slate-400 mt-0.5">{p.hint}</p>
              </button>
            ))}
          </div>
          {selectedNeedsKey && (
            <p className="text-xs text-amber-400 mt-3">
              No key for this provider in the scanner env — scans will use fallbacks (if enabled) or skip AI.
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-300" htmlFor="anthropic-model">
              Claude model
            </label>
            <select
              id="anthropic-model"
              className={inputCls}
              value={CLAUDE_MODELS.some((m) => m.value === form.anthropicModel) ? form.anthropicModel : "__custom"}
              onChange={(e) => e.target.value !== "__custom" && set("anthropicModel", e.target.value)}
            >
              {CLAUDE_MODELS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
              <option value="__custom">Custom…</option>
            </select>
            <input
              className={inputCls}
              value={form.anthropicModel}
              onChange={(e) => set("anthropicModel", e.target.value)}
              placeholder="claude-opus-5-5"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-300" htmlFor="anthropic-effort">
              Claude effort
            </label>
            <select
              id="anthropic-effort"
              className={inputCls}
              value={form.anthropicEffort}
              onChange={(e) => set("anthropicEffort", e.target.value as ClaudeEffort)}
            >
              {EFFORTS.map((e) => (
                <option key={e} value={e}>
                  {e}
                </option>
              ))}
            </select>
            <p className="text-xs text-slate-500">
              Higher effort = deeper reasoning, more tokens. &ldquo;low&rdquo; is plenty for finding explanations.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-300" htmlFor="openrouter-model">
              OpenRouter model
            </label>
            <input
              id="openrouter-model"
              className={inputCls}
              value={form.openrouterModel}
              onChange={(e) => set("openrouterModel", e.target.value)}
              placeholder="qwen/qwen3.8-27b:free"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-300" htmlFor="groq-model">
              Groq model
            </label>
            <input
              id="groq-model"
              className={inputCls}
              value={form.groqModel}
              onChange={(e) => set("groqModel", e.target.value)}
              placeholder="llama-3.1-8b-instant"
            />
          </div>
        </div>

        <label className="flex items-center gap-3 text-sm text-white">
          <input
            type="checkbox"
            checked={form.fallbacksEnabled}
            onChange={(e) => set("fallbacksEnabled", e.target.checked)}
            className="w-4 h-4 accent-indigo-500"
          />
          Fall back to other providers with keys if the primary fails
        </label>

        <div className="flex flex-wrap justify-end gap-3 pt-4 border-t border-slate-800">
          <button
            type="button"
            onClick={reset}
            disabled={saving || !state.overrides}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-700 text-sm text-slate-300 hover:border-slate-500 disabled:opacity-50"
          >
            <RotateCcw className="w-4 h-4" /> Reset to .env
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
