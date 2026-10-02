-- Phase E: ownership verification lifecycle + scan active-check status.
-- Additive only. Reuses verified_domains from 001_init.sql.
-- Note: migrate.mjs splits on semicolons — avoid DO $$ blocks.

ALTER TABLE verified_domains
  ADD COLUMN IF NOT EXISTS method text;

ALTER TABLE verified_domains
  ADD COLUMN IF NOT EXISTS status text;

ALTER TABLE verified_domains
  ADD COLUMN IF NOT EXISTS token_hash text;

ALTER TABLE verified_domains
  ADD COLUMN IF NOT EXISTS challenge_expires_at timestamptz;

ALTER TABLE verified_domains
  ADD COLUMN IF NOT EXISTS verified_expires_at timestamptz;

ALTER TABLE verified_domains
  ADD COLUMN IF NOT EXISTS last_checked_at timestamptz;

ALTER TABLE verified_domains
  ADD COLUMN IF NOT EXISTS failure_reason text;

ALTER TABLE verified_domains
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

ALTER TABLE verified_domains
  ADD CONSTRAINT verified_domains_method_check
  CHECK (
    method IS NULL
    OR method IN ('dns_txt', 'http_file')
  );

ALTER TABLE verified_domains
  ADD CONSTRAINT verified_domains_status_check
  CHECK (
    status IS NULL
    OR status IN (
      'pending',
      'verified',
      'failed',
      'expired',
      'revoked'
    )
  );

CREATE INDEX IF NOT EXISTS verified_domains_domain_idx
  ON verified_domains (domain);

CREATE INDEX IF NOT EXISTS verified_domains_status_idx
  ON verified_domains (status)
  WHERE status IS NOT NULL;

ALTER TABLE scans
  ADD COLUMN IF NOT EXISTS active_checks_status text;

ALTER TABLE scans
  ADD CONSTRAINT scans_active_checks_status_check
  CHECK (
    active_checks_status IS NULL
    OR active_checks_status IN (
      'not_applicable',
      'skipped_unverified',
      'running',
      'done',
      'failed'
    )
  );
