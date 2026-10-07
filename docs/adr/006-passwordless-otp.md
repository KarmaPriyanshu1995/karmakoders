# ADR 006 — Passwordless OTP auth for senders

Date: 2026-09-29  
Status: Accepted

## Context

The repo already has **NextAuth v4 credentials** for **CMS staff** (`/admin/login`, `/api/auth/[...nextauth]`). Sign customers should not create passwords. Signers must not create accounts at all.

## Decision

Senders authenticate with **email OTP** and an httpOnly **`kk_session` cookie**, implemented in **`src/platform/auth`** and routes under **`/api/platform/auth/*`**. Signers use a high-entropy link token plus OTP + consent. Staff keep NextAuth + permission **`sign:admin`** for `/admin/sign`.

**Do not** add OTP handlers under `/api/auth/*` (NextAuth catch-all). **Never** call `getServerSession` for Sign customers.

## Consequences

Positive: time-to-first-send stays under the 60-second / 2-minute goals; no password reset surface for customers; CMS admin remains isolated.

Negative: two session types (`kk_session` vs NextAuth); email deliverability is now a login dependency; OTP brute-force must be rate-limited in Upstash (`src/platform/rate-limit`).

Rejected alternative: NextAuth Email provider on the same `[...nextauth]` route — would mix staff and customers and still collide with the catch-all design.
