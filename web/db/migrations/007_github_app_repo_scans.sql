-- Phase G: GitHub App installations + authorized repo scans.
-- Additive only. Do not edit 001–006 destructively.

CREATE TABLE IF NOT EXISTS github_installations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
  installation_id bigint NOT NULL,
  account_login text NOT NULL,
  account_type text NOT NULL DEFAULT 'User',
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'suspended', 'uninstalled', 'revoked')),
  suspended boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, installation_id)
);

CREATE INDEX IF NOT EXISTS github_installations_project_id_idx
  ON github_installations (project_id);

CREATE INDEX IF NOT EXISTS github_installations_installation_id_idx
  ON github_installations (installation_id);

CREATE TABLE IF NOT EXISTS github_repos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  installation_id uuid NOT NULL REFERENCES github_installations (id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
  owner text NOT NULL,
  name text NOT NULL,
  full_name text NOT NULL,
  default_branch text NOT NULL DEFAULT 'main',
  private boolean NOT NULL DEFAULT true,
  html_url text,
  selected boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, full_name)
);

CREATE INDEX IF NOT EXISTS github_repos_project_id_idx
  ON github_repos (project_id);

CREATE INDEX IF NOT EXISTS github_repos_installation_id_idx
  ON github_repos (installation_id);

CREATE INDEX IF NOT EXISTS github_repos_full_name_idx
  ON github_repos (full_name);

ALTER TABLE scans
  ADD COLUMN IF NOT EXISTS github_repo_id uuid REFERENCES github_repos (id) ON DELETE SET NULL;

ALTER TABLE scans
  ADD COLUMN IF NOT EXISTS repo_full_name text;

ALTER TABLE scans
  ADD COLUMN IF NOT EXISTS repo_commit_sha text;

ALTER TABLE scans
  ADD COLUMN IF NOT EXISTS github_scan_status text;

ALTER TABLE scans
  ADD COLUMN IF NOT EXISTS repo_scan_summary jsonb;

-- Drop and recreate check so migrate.mjs (semicolon-split) stays valid.
ALTER TABLE scans DROP CONSTRAINT IF EXISTS scans_github_scan_status_check;

ALTER TABLE scans
  ADD CONSTRAINT scans_github_scan_status_check
  CHECK (
    github_scan_status IS NULL
    OR github_scan_status IN (
      'skipped_unauthorized',
      'running',
      'done',
      'failed',
      'partial',
      'budget_exhausted',
      'not_applicable'
    )
  );
