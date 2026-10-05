-- Phase E hotfix: store the exact DNS TXT verification hostname per challenge.
-- domain = claimed host (e.g. www.example.com)
-- verification_hostname = _karmakoders-verify.<claimed host>
-- Note: migrate.mjs splits on semicolons — avoid DO $$ blocks.

ALTER TABLE verified_domains
  ADD COLUMN IF NOT EXISTS verification_hostname text;
