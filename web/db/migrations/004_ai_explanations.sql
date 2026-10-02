-- Phase D: AI explanation / fix-prompt artifacts (additive only).
-- Scanner truth remains in severity/confidence/verification/grade columns.
-- Note: migrate.mjs splits on semicolons — avoid DO $$ blocks.

ALTER TABLE findings
  ADD COLUMN IF NOT EXISTS ai_status text;

ALTER TABLE findings
  ADD COLUMN IF NOT EXISTS ai_explanation jsonb;

ALTER TABLE findings
  ADD COLUMN IF NOT EXISTS ai_provider text;

ALTER TABLE findings
  ADD COLUMN IF NOT EXISTS ai_model text;

ALTER TABLE findings
  ADD COLUMN IF NOT EXISTS ai_prompt_version text;

ALTER TABLE findings
  ADD COLUMN IF NOT EXISTS ai_content_version text;

ALTER TABLE findings
  ADD COLUMN IF NOT EXISTS ai_generated_at timestamptz;

ALTER TABLE findings
  ADD COLUMN IF NOT EXISTS ai_error text;

ALTER TABLE findings
  ADD CONSTRAINT findings_ai_status_check
  CHECK (
    ai_status IS NULL
    OR ai_status IN (
      'not_generated',
      'generating',
      'generated',
      'failed',
      'stale'
    )
  );

CREATE INDEX IF NOT EXISTS findings_ai_status_idx ON findings (ai_status)
  WHERE ai_status IS NOT NULL;
