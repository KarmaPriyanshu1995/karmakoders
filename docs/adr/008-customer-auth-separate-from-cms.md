# ADR 008 — Customer auth separate from CMS NextAuth

Date: 2026-10-07  
Status: Accepted

## Context

karmakoders.com already has an authentication system: **NextAuth v4** credentials for **CMS staff**. It uses bcrypt passwords on the CMS `User` model, tenant access through `Membership`, the `/api/auth/[...nextauth]` catch-all, the `next-auth.session-token` cookie, and `src/proxy.ts` gating `/admin/*`.

Sign introduces a second population, **product customers** (senders), who:

- must never get CMS access, even by misconfiguration
- log in passwordless with email OTP ([ADR 006](./006-passwordless-otp.md))
- belong to a shared paid-tools platform, not to a CMS tenant ([ADR 002](./002-postgres-prisma.md))

Reusing NextAuth for customers would mean either mixing customers into CMS `User`/`Membership`, or running two NextAuth configurations under one `/api/auth/*` catch-all.

## Decision

Customer authentication is a **separate system** owned by `src/platform/auth`:

| | Staff (CMS) | Customers (Sign and future tools) |
|---|---|---|
| Library | NextAuth v4 | `src/platform/auth` (own code) |
| Identity | CMS `User` + `Membership` | `PlatformCustomer` (no relation to CMS models) |
| Login | Password at `/admin/login` | Email OTP at `/tools/sign/login` |
| API | `/api/auth/[...nextauth]` | `/api/platform/auth/*` (`otp/request`, `otp/verify`, `logout`, `me`) |
| Cookie | `next-auth.session-token` (JWT) | `kk_session`: an opaque random token, HMAC-hashed at rest in `platform_sessions`, httpOnly, `SameSite=Lax`, `Secure` in production |
| Session lookup | `getServerSession` / `getToken` | `getCustomerSession()` / `requireCustomerSession()` |
| Secret | `NEXTAUTH_SECRET` | `SESSION_SECRET` (never reuse `NEXTAUTH_SECRET`) |

Rules:

- Customer code **never** calls `getServerSession` or `getToken`, and staff code never reads `kk_session`.
- Customer routes never live under `/api/auth/*`, which belongs to the NextAuth catch-all.
- A valid `kk_session` grants nothing in `/admin/*`; `src/proxy.ts` keeps checking only the NextAuth token there.
- Signers have no account at all: they use a link token plus OTP plus consent, stored on `SignSigner`.

## Consequences

Positive:

- A customer session can't be escalated into CMS access; the two systems share no cookie, table or secret.
- Customer sessions are server-side rows and can be revoked one by one (logout, admin, suspected compromise), unlike stateless JWTs.
- The platform auth layer is reusable by future `/tools/*` products.

Negative:

- Two auth stacks to maintain and test, plus two secrets to rotate.
- Session revocation and OTP throttling are our responsibility (Upstash rate limits, `platform_sessions.revoked_at`).
- A person who is both staff and a customer has two independent logins. That's intended.

Rejected alternatives:

- **NextAuth Email provider for customers on the same catch-all:** mixes staff and customers in one config, cookie and user table.
- **Second NextAuth instance on another base path:** still couples customers to NextAuth's JWT/session model and its `User` adapter conventions, for little benefit over a small OTP module.
