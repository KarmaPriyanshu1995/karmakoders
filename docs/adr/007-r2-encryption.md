# ADR 007 — Cloudflare R2 with application-level encryption

Date: 2026-09-29  
Status: Accepted

## Context

Signed PDFs are retained **7 years** unless deleted. UploadThing in this repo stores CMS/media and career CVs and returns CDN URLs — not appropriate for private legal files. Vercel’s filesystem is ephemeral.

## Decision

Store objects in a **private Cloudflare R2** bucket. Encrypt payloads with **AES-256-GCM** in `src/platform/storage` using `FILE_ENCRYPTION_KEY` before upload. Persist `key` (object id), `iv`, `authTag`, and `keyVersion` on Sign/Platform Prisma rows. Downloads use short-lived signed URLs or an authenticated byte stream. **Never use UploadThing for Sign.**

## Consequences

Positive: encryption at rest even if a bucket policy is mis-set; Swap R2 later without changing Prisma metadata shape; UploadThing remains for CMS only.

Negative: key rotation requires versioned keys; lost `FILE_ENCRYPTION_KEY` means permanent data loss — key must live in Vercel env + a sealed backup; CPU cost on encrypt/decrypt in serverless.

Rejected alternative: UploadThing private files — still a third-party CDN threat model and no 7-year contractual control comparable to our own bucket + key.
