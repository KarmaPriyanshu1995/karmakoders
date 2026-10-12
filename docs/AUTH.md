# Customer authentication — KarmaKoders Sign

Senders (product customers) sign in with an emailed one-time code. Customer auth is completely separate from the CMS staff login (NextAuth) — see [ADR 006](./adr/006-passwordless-otp.md) and [ADR 008](./adr/008-customer-auth-separate-from-cms.md). Signers never have accounts.

All routes below return **404 while `SIGN_APP_ENABLED` is not `"true"`** (launch switch, [ENV.md](./ENV.md)).

## Code map

| Concern | Where |
|---|---|
| Sessions, cookie, `getCurrentCustomer`, `requireCustomer`, revoke | `src/platform/auth/session.ts`, `constants.ts`, `crypto.ts` |
| OTP request / verify | `src/platform/auth/otp.ts` |
| Safe post-login redirects | `src/platform/auth/redirect.ts` |
| `GET me` profile (field whitelist) | `src/platform/auth/profile.ts` |
| CSRF origin check | `src/platform/security/origin.ts` |
| Route wrapper (launch switch + CSRF + error mapping) | `src/modules/sign/launch/route.ts` (`signApiRoute`) |
| Rate limits | `src/platform/rate-limit` |
| Signed-out redirect for app pages | `src/proxy.ts` |
| Login UI / dashboard | `src/app/tools/sign/(app)/login`, `src/app/tools/sign/(app)/dashboard` |

## Sign-in flow

1. `POST /api/platform/auth/otp/request` `{ email }` — always `{ ok: true }` for a valid email (no account enumeration). Creates a 6-digit code (stored as an HMAC bound to email + purpose, 10-minute TTL) and invalidates older unused codes for that email, then emails the code via Resend.
2. `POST /api/platform/auth/otp/verify` `{ email, code }` — one DB transaction: conditional attempt increment (max **5** per code), constant-time hash compare, conditional consume, customer upsert, new session. Two concurrent verifies with the right code produce exactly one session. Every failure returns the same message.
3. The response sets the session cookie; the login page redirects to `safeNextPath(next)`.

Other routes: `POST logout` (this session), `POST logout-all` (every session of the customer), `GET me` (`id`, `email`, `name`, `creditsBalance`, active subscriptions — parsed through a zod whitelist, so hashes, tokens and Paddle ids can never leak).

## Sessions

| Property | Value |
|---|---|
| Token | 32 random bytes, base64url (`crypto.randomBytes`). Shown to the browser only. |
| Storage | `platform_sessions.token_hash` = HMAC-SHA256(token, `SESSION_SECRET`). The raw token is never stored or logged. |
| New on login | Every successful verify creates a brand-new session and token; tokens are never reused or rotated into. |
| Idle expiry | 30 days, **sliding**: `lastSeenAt`/`expiresAt` are refreshed at most **once per hour** (conditional `updateMany`, so concurrent requests don't all write). |
| Absolute limit | 90 days from `createdAt`, regardless of activity. `expiresAt` is never extended past it, and sessions older than 90 days are rejected. |
| Validation | `getCurrentCustomer()` (React `cache()`, once per request) checks cookie → hash lookup → `revokedAt` → `expiresAt` → 90-day cap → customer `status = ACTIVE`. Anything else is "signed out". |
| Revocation | `revokeSession()` (logout) and `revokeAllSessions(customerId)` (logout everywhere) set `revokedAt`; checks are server-side, so revocation takes effect on the next request. |
| Pages | `requireCustomer({ redirectToLoginFrom: path })` → redirect to `/tools/sign/login?next=<path>`. |
| APIs / Server Actions | `requireCustomer()` → 401 JSON via `toHttpError`. |

## Cookie

| Attribute | Production | Development / test |
|---|---|---|
| Name | `__Host-kk_session` | `kk_session` |
| HttpOnly | yes | yes |
| Secure | yes | no (localhost is plain HTTP) |
| SameSite | Lax | Lax |
| Path | `/` | `/` |
| Domain | none | none |
| Max-Age | 90 days (the absolute cap; the server enforces the 30-day idle window) | same |

The `__Host-` prefix makes the browser refuse the cookie unless it is Secure, `Path=/` and has no `Domain`, so a subdomain or an HTTP response can't plant or overwrite it. It never shares a name with the NextAuth staff cookie.

## Rate limits

Upstash sliding window via `src/platform/rate-limit`. In-memory only in development/test; in production missing Upstash config throws and Upstash errors **fail closed** (deny).

| Route | Limit |
|---|---|
| `otp/request` | 3 per 10 minutes per email **and** 10 per hour per IP |
| `otp/verify` | 20 per hour per IP; plus at most 5 attempts per code (in the DB) |

A blocked request gets **429**, `code: "rate_limited"`, a friendly message and `Retry-After` (seconds, the longest wait among the limits hit).

**Client IP.** `x-forwarded-for` (first entry), else `x-real-ip`. On Vercel every request passes through Vercel's edge, which overwrites these headers with the real client IP, so a client cannot spoof them to dodge per-IP limits. Outside Vercel they are client-controlled — acceptable only for development/test.

## CSRF

`assertSameOrigin(request)` requires the browser's `Origin` header (falling back to the `Referer` origin) to **exactly** match an allowed origin; a missing or `null` origin is rejected with 403.

Allowed origins:

- `APP_URL` (`https://www.karmakoders.com` in production)
- this deployment's own Vercel preview URLs (`VERCEL_URL`, `VERCEL_BRANCH_URL`) when `VERCEL_ENV=preview` — no `*.vercel.app` wildcard
- `ALLOWED_ORIGINS_EXTRA`: optional comma-separated **https** origins (scheme + host, no path), e.g. a staging server outside Vercel. Validated with zod at first use; `http` only for localhost in development; empty entries ignored; an invalid entry fails loudly instead of being skipped. Nothing else (including `staging.karmakoders.com`) is allowed unless listed.
- `http://localhost:3000` only when `NODE_ENV=development`

Applied by `signApiRoute()` to every POST/PUT/PATCH/DELETE under `/api/platform/*` (and, when they are added, `/api/tools/sign/*` — new routes must use `signApiRoute`), and called directly in data-changing Server Actions (early access, dashboard logout). **Webhooks are excluded** (the future Paddle webhook verifies its signature instead and must not use `signApiRoute`). SameSite=Lax on the cookie is a second layer.

## Redirects

`safeNextPath(next)` accepts only paths that, after up to three rounds of URL-decoding, start with `/tools/sign/`, contain no `//`, no backslash, no control characters and no scheme, and still resolve under `/tools/sign/` after `..` normalisation. It never returns the login page itself. Anything else → `/tools/sign/dashboard`. Fully percent-encoded paths are rejected (Next.js already decodes `searchParams` once).

`src/proxy.ts` sends signed-out visitors of `/tools/sign/dashboard`, `/new/*`, `/documents/*`, `/billing` and `/settings` to `/tools/sign/login?next=<path>` based on **cookie presence only** (cheap, no DB); every page and handler still calls `requireCustomer()` — the proxy is not the security boundary. The launch-switch 404 is applied first; `/admin` is unaffected.

## Threat model

| Threat | Mitigation |
|---|---|
| **Stolen session cookie** | HttpOnly (no JS access), Secure + `__Host-` in production, SameSite=Lax. Only the HMAC is stored, so a DB leak yields no usable cookies. 30-day idle / 90-day absolute expiry. "Log out of all devices" revokes every session server-side immediately. Suspended customers are rejected on every request. |
| **Brute force of codes** | 6-digit code, 10-minute TTL, max 5 attempts per code enforced atomically in the DB (conditional increment), 20 verifies per hour per IP, constant-time compare, requesting a new code invalidates the old one. |
| **Email bombing** (flooding someone's inbox with codes) | 3 code requests per 10 minutes per email and 10 per hour per IP; production rate limiting fails closed if Upstash is down. |
| **Open redirect** via `next` | `safeNextPath`: only `/tools/sign/…` paths after full decoding and normalisation; schemes, `//`, backslashes, control characters and traversal are rejected; default dashboard. |
| **CSRF** | Exact Origin/Referer allow-list on every mutating route and Server Action; missing Origin rejected; SameSite=Lax cookie; JSON bodies. |
| **Account enumeration** | `otp/request` answers identically whether or not the email has an account; `otp/verify` returns one generic error for every failure (unknown email, wrong, expired, exhausted or already-used code); precise reasons are only logged server-side with the email masked. |
| **Session fixation** | Sessions are created only after a successful verify, with a fresh random token; the server never accepts a client-chosen token (it must match a stored HMAC), and `__Host-` blocks subdomains from planting a cookie. |

## Not in scope here

- The OTP email itself (Resend, template and subject) is unchanged from the tested implementation in `src/platform/email`.
- Signer authentication (link token + OTP + consent) is part of the signing flow.
