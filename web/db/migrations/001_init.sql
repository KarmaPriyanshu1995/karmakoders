-- Phase 1 schema. Active probes (RLS, Firebase, repo scans) stay locked
-- until verified_domains.verified_at is set for that domain.

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Nullable so a passive URL scan can exist before anyone creates an account.
  user_id uuid REFERENCES users (id) ON DELETE CASCADE,
  name text NOT NULL,
  primary_url text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS projects_user_id_idx ON projects (user_id);

CREATE TABLE IF NOT EXISTS verified_domains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
  domain text NOT NULL,
  verification_token text NOT NULL UNIQUE,
  verified_at timestamptz,
  UNIQUE (project_id, domain)
);

CREATE TABLE IF NOT EXISTS scans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('url', 'repo')),
  status text NOT NULL CHECK (status IN ('queued', 'running', 'done', 'failed')),
  grade text CHECK (grade IS NULL OR grade IN ('A', 'B', 'C', 'D', 'F')),
  started_at timestamptz,
  finished_at timestamptz
);

CREATE INDEX IF NOT EXISTS scans_project_id_idx ON scans (project_id);

CREATE TABLE IF NOT EXISTS scan_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id uuid NOT NULL UNIQUE REFERENCES scans (id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('queued', 'running', 'done', 'failed')),
  locked_at timestamptz,
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0)
);

-- Claim path for the worker: queued jobs, or running jobs whose lock expired.
-- SELECT id FROM scan_jobs WHERE status = 'queued'
--    OR (status = 'running' AND locked_at < now() - interval '15 minutes')
-- ORDER BY id FOR UPDATE SKIP LOCKED LIMIT 1;
CREATE INDEX IF NOT EXISTS scan_jobs_claim_idx ON scan_jobs (locked_at)
  WHERE status IN ('queued', 'running');

CREATE TABLE IF NOT EXISTS scan_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id uuid NOT NULL REFERENCES scans (id) ON DELETE CASCADE,
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS scan_events_scan_id_created_at_idx
  ON scan_events (scan_id, created_at);

CREATE TABLE IF NOT EXISTS findings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id uuid NOT NULL REFERENCES scans (id) ON DELETE CASCADE,
  -- SHA-256 of type + location + param, so the same issue matches across scans.
  fingerprint text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low', 'info')),
  title text NOT NULL,
  explanation text,
  fix_prompt text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'fixed', 'wont_fix')),
  first_seen_scan_id uuid REFERENCES scans (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (scan_id, fingerprint)
);

CREATE INDEX IF NOT EXISTS findings_fingerprint_idx ON findings (fingerprint);

CREATE TABLE IF NOT EXISTS evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  finding_id uuid NOT NULL REFERENCES findings (id) ON DELETE CASCADE,
  redacted_text text,
  storage_pointer text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS evidence_finding_id_idx ON evidence (finding_id);
