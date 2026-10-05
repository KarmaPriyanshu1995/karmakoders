-- Phase F: attack-surface inventory + discovery/fuzz budgets.
-- Additive only. Do not edit 001–005 destructively.
-- Note: migrate.mjs splits on semicolons — avoid DO $$ blocks.

ALTER TABLE scans DROP CONSTRAINT IF EXISTS scans_active_checks_status_check;

ALTER TABLE scans
  ADD CONSTRAINT scans_active_checks_status_check
  CHECK (
    active_checks_status IS NULL
    OR active_checks_status IN (
      'not_applicable',
      'skipped_unverified',
      'running',
      'done',
      'failed',
      'partial',
      'budget_exhausted'
    )
  );

ALTER TABLE scans
  ADD COLUMN IF NOT EXISTS attack_surface_summary jsonb;

CREATE TABLE IF NOT EXISTS scan_attack_surface (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id uuid NOT NULL REFERENCES scans (id) ON DELETE CASCADE,
  url text NOT NULL,
  host text NOT NULL,
  path text NOT NULL DEFAULT '/',
  method text NOT NULL DEFAULT 'GET',
  source text NOT NULL,
  endpoint_type text NOT NULL DEFAULT 'unknown',
  content_type text,
  status_code integer,
  parameters jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_external boolean NOT NULL DEFAULT false,
  is_gated boolean NOT NULL DEFAULT true,
  test_status text NOT NULL DEFAULT 'discovered',
  fetched boolean NOT NULL DEFAULT false,
  tested boolean NOT NULL DEFAULT false,
  skip_reason text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  discovered_at timestamptz NOT NULL DEFAULT now(),
  last_tested_at timestamptz,
  UNIQUE (scan_id, method, url)
);

CREATE INDEX IF NOT EXISTS scan_attack_surface_scan_id_idx
  ON scan_attack_surface (scan_id);

CREATE INDEX IF NOT EXISTS scan_attack_surface_type_idx
  ON scan_attack_surface (scan_id, endpoint_type);

CREATE INDEX IF NOT EXISTS scan_attack_surface_source_idx
  ON scan_attack_surface (scan_id, source);
