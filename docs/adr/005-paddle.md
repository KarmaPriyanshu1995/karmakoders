# ADR 005 — Paddle as merchant of record

Date: 2026-09-29  
Status: Accepted

## Context

v1 sells USD credit packs and subscriptions (Sign Pro, All Access) to US, UK, Canada, Australia, and Western Europe. KarmaKoders should not collect VAT/GST as a raw Stripe merchant in every country on day one.

## Decision

**Paddle Billing** is merchant of record. Webhooks at `/api/webhooks/paddle`. Price IDs are env vars (see ENV.md). Credits and entitlements are recorded in Postgres (`Platform*` models via Prisma) after verified webhooks, not after a client-only “success” callback.

## Consequences

Positive: tax/VAT handled by Paddle; checkout UI overlay; refunds and failed payments have a vendor portal.

Negative: Paddle’s model and fees; sandbox vs live (`NEXT_PUBLIC_PADDLE_ENV`); webhook idempotency is mandatory; failed webhooks need `/admin/sign` retry.

Rejected alternative: Stripe direct — more tax work for v1 EU/UK.
