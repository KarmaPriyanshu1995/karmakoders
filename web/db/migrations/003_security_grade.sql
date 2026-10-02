-- Phase C: persist security grade metadata (algorithm version + breakdown).
-- Additive only. Historical scans keep grade NULL / new columns NULL.

ALTER TABLE scans
  ADD COLUMN IF NOT EXISTS grade_algorithm_version text;

ALTER TABLE scans
  ADD COLUMN IF NOT EXISTS grade_breakdown jsonb;

ALTER TABLE scans
  ADD COLUMN IF NOT EXISTS grade_calculated_at timestamptz;
