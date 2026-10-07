# ADR 004 — Inngest for background jobs

Date: 2026-09-29  
Status: Accepted

## Context

Send must return immediately after entitlement lock. Reminders, expiry, emails, and PDF completion cannot run inside a user request. The repo has **no queue** and an in-memory rate limiter that will not work across Vercel instances. There is no GitHub Actions cron.

## Decision

Use **Inngest** for Sign jobs: `sign/document.sent`, `sign/document.complete`, `sign/reminder.tick`, `sign/document.expire`, Paddle side effects if needed.

## Consequences

Positive: retries, fan-out, and scheduled functions without owning Redis Streams; fits Vercel via Inngest’s serve route; emails stay off the request path.

Negative: vendor dependency; `INNGEST_SIGNING_KEY` must be set in prod or jobs will not verify; local dev needs the Inngest Dev Server.

Rejected alternative: Vercel Cron + a `src/app/api/cron` route — worse retries and easier to miss signatures if a cron run fails mid-batch.
