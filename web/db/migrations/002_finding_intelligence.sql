-- Phase B: finding intelligence (category, confidence, type, verification).
-- Additive only. Historical rows keep NULL for new columns until re-scanned.
-- Note: migrate.mjs splits on semicolons — avoid DO $$ blocks.

ALTER TABLE findings
  ADD COLUMN IF NOT EXISTS category text;

ALTER TABLE findings
  ADD COLUMN IF NOT EXISTS confidence double precision;

ALTER TABLE findings
  ADD COLUMN IF NOT EXISTS confidence_reason text;

ALTER TABLE findings
  ADD COLUMN IF NOT EXISTS finding_type text;

ALTER TABLE findings
  ADD COLUMN IF NOT EXISTS scanner_source text;

ALTER TABLE findings
  ADD COLUMN IF NOT EXISTS verification_status text;

ALTER TABLE findings
  ADD COLUMN IF NOT EXISTS metadata jsonb;

ALTER TABLE findings
  ADD CONSTRAINT findings_category_check
  CHECK (
    category IS NULL
    OR category IN (
      'secrets',
      'authentication',
      'authorization',
      'api_security',
      'configuration',
      'headers',
      'tls',
      'cors',
      'exposure',
      'dependency',
      'injection',
      'input_validation',
      'file_upload',
      'database',
      'cryptography',
      'business_logic',
      'ai_security',
      'other'
    )
  );

ALTER TABLE findings
  ADD CONSTRAINT findings_confidence_check
  CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1));

ALTER TABLE findings
  ADD CONSTRAINT findings_verification_status_check
  CHECK (
    verification_status IS NULL
    OR verification_status IN (
      'unverified',
      'verified',
      'not_applicable',
      'candidate'
    )
  );

CREATE INDEX IF NOT EXISTS findings_category_idx ON findings (category)
  WHERE category IS NOT NULL;

CREATE INDEX IF NOT EXISTS findings_finding_type_idx ON findings (finding_type)
  WHERE finding_type IS NOT NULL;
