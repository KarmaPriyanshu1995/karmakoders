-- Phase I: schedules, fingerprint lifecycle, scan diffs, fix verification.
-- Additive only. Do not edit 001–007 destructively.
-- migrate.mjs splits on semicolons — avoid DO $$ blocks.

CREATE TABLE IF NOT EXISTS scan_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
  target_type text NOT NULL CHECK (target_type IN ('url', 'repo')),
  github_repo_id uuid REFERENCES github_repos (id) ON DELETE CASCADE,
  cadence text NOT NULL CHECK (cadence IN ('daily', 'weekly', 'monthly')),
  timezone text NOT NULL DEFAULT 'UTC',
  enabled boolean NOT NULL DEFAULT true,
  next_run_at timestamptz NOT NULL,
  last_enqueued_at timestamptz,
  last_scan_id uuid REFERENCES scans (id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS scan_schedules_project_id_idx
  ON scan_schedules (project_id);

CREATE INDEX IF NOT EXISTS scan_schedules_due_idx
  ON scan_schedules (next_run_at)
  WHERE enabled = true;

CREATE TABLE IF NOT EXISTS project_finding_states (
  project_id uuid NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
  fingerprint text NOT NULL,
  state text NOT NULL CHECK (state IN ('open', 'fixed')),
  title text,
  severity text,
  category text,
  finding_type text,
  first_seen_scan_id uuid REFERENCES scans (id) ON DELETE SET NULL,
  last_open_scan_id uuid REFERENCES scans (id) ON DELETE SET NULL,
  last_fixed_scan_id uuid REFERENCES scans (id) ON DELETE SET NULL,
  regression_count integer NOT NULL DEFAULT 0 CHECK (regression_count >= 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (project_id, fingerprint)
);

CREATE INDEX IF NOT EXISTS project_finding_states_state_idx
  ON project_finding_states (project_id, state);

CREATE TABLE IF NOT EXISTS scan_diffs (
  scan_id uuid PRIMARY KEY REFERENCES scans (id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
  compared_to_scan_id uuid REFERENCES scans (id) ON DELETE SET NULL,
  diff_status text NOT NULL DEFAULT 'computed'
    CHECK (diff_status IN ('computed', 'skipped_incomplete', 'skipped_no_baseline')),
  new_fingerprints jsonb NOT NULL DEFAULT '[]'::jsonb,
  unresolved_fingerprints jsonb NOT NULL DEFAULT '[]'::jsonb,
  fixed_fingerprints jsonb NOT NULL DEFAULT '[]'::jsonb,
  regression_fingerprints jsonb NOT NULL DEFAULT '[]'::jsonb,
  new_count integer NOT NULL DEFAULT 0,
  unresolved_count integer NOT NULL DEFAULT 0,
  fixed_count integer NOT NULL DEFAULT 0,
  regression_count integer NOT NULL DEFAULT 0,
  grade_previous text,
  grade_current text,
  summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  computed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS scan_diffs_project_id_idx
  ON scan_diffs (project_id);

CREATE TABLE IF NOT EXISTS finding_fix_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  finding_id uuid NOT NULL REFERENCES findings (id) ON DELETE CASCADE,
  scan_id uuid NOT NULL REFERENCES scans (id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
  fingerprint text NOT NULL,
  result text NOT NULL CHECK (
    result IN ('fix_verified', 'still_vulnerable', 'verification_inconclusive')
  ),
  procedure text NOT NULL,
  evidence_redacted text,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS finding_fix_verifications_finding_id_idx
  ON finding_fix_verifications (finding_id);

ALTER TABLE findings
  ADD COLUMN IF NOT EXISTS fix_verify_status text;

ALTER TABLE findings
  ADD COLUMN IF NOT EXISTS fix_verify_at timestamptz;

ALTER TABLE findings
  ADD COLUMN IF NOT EXISTS fix_verify_note text;

ALTER TABLE findings DROP CONSTRAINT IF EXISTS findings_fix_verify_status_check;

ALTER TABLE findings
  ADD CONSTRAINT findings_fix_verify_status_check
  CHECK (
    fix_verify_status IS NULL
    OR fix_verify_status IN (
      'fix_verified',
      'still_vulnerable',
      'verification_inconclusive'
    )
  );

ALTER TABLE scans
  ADD COLUMN IF NOT EXISTS trigger_source text;

ALTER TABLE scans
  ADD COLUMN IF NOT EXISTS schedule_id uuid REFERENCES scan_schedules (id) ON DELETE SET NULL;

ALTER TABLE scans
  ADD COLUMN IF NOT EXISTS compared_to_scan_id uuid REFERENCES scans (id) ON DELETE SET NULL;

ALTER TABLE scans
  ADD COLUMN IF NOT EXISTS fingerprint_algo_version text;

ALTER TABLE scans DROP CONSTRAINT IF EXISTS scans_trigger_source_check;

ALTER TABLE scans
  ADD CONSTRAINT scans_trigger_source_check
  CHECK (
    trigger_source IS NULL
    OR trigger_source IN ('manual', 'schedule', 'github_push', 'verify_fix')
  );
