# ADR 002 — Postgres + Prisma (reuse existing cluster)

Date: 2026-09-29  
Status: Accepted (supersedes earlier MongoDB Atlas draft)

## Context

This application already uses **PostgreSQL (Neon) + Prisma 7** for CMS, tenancy, SEO, and free tools. Sign needs senders, sessions, documents, signer tokens, append-only evidence events, and a cross-tool wallet. A second database (MongoDB Atlas + Mongoose) would add dual connection pools, dual backups, and join pain for staff admin.

## Decision

Store the **Sign and shared platform bounded contexts** in the **existing PostgreSQL cluster** via **Prisma 7**, using new models prefixed:

- **`Platform*`** — wallet, entitlements, credits, Paddle mappings, OTP sessions shared across tools
- **`Sign*`** — documents, signers, signature events, evidence/audit trail, templates metadata

**Never** reference CMS models `User`, `Membership`, `Tenant`, or `AuditLog` from Sign domain code. Customer senders are `PlatformCustomer` (or equivalent), not CMS `User`. Staff Sign admin authenticates with existing NextAuth and is authorized by permission `sign:admin`; it loads Sign rows by id/email without mixing schemas.

Reuse `DATABASE_URL` and `src/lib/prisma.ts` (or a thin `src/platform/db` re-export). Ship schema via normal `prisma migrate`.

## Consequences

Positive: one database, one migrate pipeline on Vercel build, one backup story; engineers already know Prisma; send locks can use Postgres transactions.

Negative: CMS and Sign share Neon compute/connection budget; migrations must stay additive and carefully reviewed so Sign tables never couple to CMS FKs.

Rejected alternative: MongoDB Atlas + Mongoose (dual-DB ops cost not justified for v1).
