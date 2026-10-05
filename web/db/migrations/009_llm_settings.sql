-- Admin-editable LLM provider/model selection (single row, id = 1).
-- API keys are never stored here, they stay in the worker's env.
-- Note: migrate.mjs splits on semicolons — avoid DO $$ blocks.

CREATE TABLE IF NOT EXISTS llm_settings (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  enabled boolean,
  provider text CHECK (
    provider IS NULL
    OR provider IN ('auto', 'openrouter', 'groq', 'anthropic', 'none')
  ),
  openrouter_model text,
  groq_model text,
  anthropic_model text,
  anthropic_effort text CHECK (
    anthropic_effort IS NULL
    OR anthropic_effort IN ('low', 'medium', 'high', 'xhigh', 'max')
  ),
  fallbacks_enabled boolean,
  updated_by text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
