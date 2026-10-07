# Environment variables — KarmaKoders Sign

No real secrets. Set these in Vercel (and locally in `.env.local` / a Sign-specific overlay). **Do not commit values.**

Existing site vars (`DATABASE_URL`, `NEXTAUTH_*`, UploadThing, registrar APIs) stay as they are. Sign **reuses `DATABASE_URL`** for Prisma (CMS + `Platform*` / `Sign*` models). Sign adds the list below.

Legacy CMS vars are documented in [REPO_AUDIT.md](./REPO_AUDIT.md). They are not repeated here.

## App

| Name | Purpose | Example format |
|---|---|---|
| `APP_URL` | Canonical origin for emails and HMAC callbacks (no trailing slash) | `https://www.karmakoders.com` |
| `NEXT_PUBLIC_APP_URL` | Browser-facing origin (Paddle, PostHog, links) | `https://www.karmakoders.com` |

Prefer these for Sign even if `NEXT_PUBLIC_SITE_URL` already exists, so product URLs are explicit.

## Launch switch

| Name | Purpose | Example format |
|---|---|---|
| `SIGN_APP_ENABLED` | Server-side launch switch for the Sign app. `"true"` or `"false"`; **unset means `false`** (pre-launch). Any other value throws a clear error when first read. Read through `src/platform/env/flags.ts`. | `false` |

When **false** (default):

- `/tools/sign`, `/tools/sign/pricing` and the template pages show **"Get early access"** CTAs. They link to, or render, the early-access form (`/tools/sign#early-access`).
- `/tools/sign/login`, `/dashboard`, `/new/*`, `/documents/*`, `/billing`, `/settings`, the signer links `/tools/sign/s/*` and `/tools/sign/sign/*`, and `/api/platform/auth/*` all return **404**.
- This is enforced on the server three ways: `src/proxy.ts` (plain 404 for pages, 404 JSON for APIs), `notFound()` in the app, signer and login pages, and a 404 JSON `PlatformError` in the auth API routes. Hiding links is only UX.

When **true**, CTAs say **"Get started"** and link to `/tools/sign/login`, and all app routes work.

Marketing pages read the flag when they render, and Vercel applies env changes on the next deployment, so **redeploy after changing `SIGN_APP_ENABLED`**. The proxy and API checks read it on every request.

## Auth and tokens

| Name | Purpose | Example format |
|---|---|---|
| `SESSION_SECRET` | Sign sender `kk_session` MAC/encryption (min 32 bytes entropy) | `base64:c2lnbl9zZXNzaW9uX2Rldi9rZXlfMzJieXRlcw==` |
| `TOKEN_PEPPER` | HMAC pepper for signer URL tokens at rest | `base64:c2lnbmVyX3Rva2VuX3BlcHBlcl8zMmJ5dGVz` |

Do not reuse `NEXTAUTH_SECRET` for `kk_session`.

## Database

| Name | Purpose | Example format |
|---|---|---|
| `DATABASE_URL` | **Pooled** Neon PostgreSQL URL (host contains `-pooler`) used by the **application runtime** through the pg adapter in `src/lib/prisma.ts` (CMS + Platform\* + Sign\* models), and by integration tests | `postgresql://user:pass@ep-xxx-pooler.neon.tech/neondb?sslmode=require` |
| `DIRECT_URL` | Optional **direct** (non-pooled) Neon URL for the same database. Used only by **Prisma CLI** commands (`migrate deploy`, `migrate status`), which need session-level advisory locks that PgBouncer pooling doesn't support. Falls back to `DATABASE_URL` when unset. | `postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require` |

There is **no** `MONGODB_URI`. Sign does not introduce a second database.

### Local development and tests: `.env.local` + the Neon dev branch

All local variables live in **`.env.local`**, and its `DATABASE_URL` points to the **Neon dev branch**. `next dev`, the Prisma CLI and Vitest all use it:

| Consumer | How it loads env |
|---|---|
| `next dev` | Next.js built-in loading (`.env.local` > `.env`). |
| Prisma CLI (`prisma migrate …`) | `prisma.config.ts` loads `.env.local`, then `.env`, with **no override**: anything already set in the process environment (Vercel, CI) always wins. It connects with `DIRECT_URL` when set, otherwise `DATABASE_URL`. |
| Vitest | `vitest.setup.ts` loads `.env.local` explicitly (Next.js skips it when `NODE_ENV=test`), then the standard Next.js files, again without overriding the process environment. |

- There is **no separate test database variable**. DB integration tests (`*.integration.test.ts`) use `DATABASE_URL`.
- **Integration tests clear dev data** in `platform_*` and `sign_*` tables before and after each suite. They never touch CMS tables, and `sign_early_access` is always preserved.
- They refuse to run when `NODE_ENV=production` or `VERCEL_ENV` is `production`/`preview`, and refuse a localhost database outside CI.
- In CI, both `DATABASE_URL` and `DIRECT_URL` point to the `postgres:16` service container (with `CI=true`).
- On Vercel, set `DATABASE_URL` (pooled) and `DIRECT_URL` (direct) so the build's `prisma migrate deploy` uses the direct connection.
- Before any migration, `npx prisma migrate status` prints the host it will use. `prisma migrate dev` / `migrate reset` never run against production.

## Files

| Name | Purpose | Example format |
|---|---|---|
| `FILE_ENCRYPTION_KEY` | AES-256-GCM key (32 bytes) | `base64:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=` |
| `R2_ACCOUNT_ID` | Cloudflare account id | `0123456789abcdef0123456789abcdef` |
| `R2_ACCESS_KEY_ID` | R2 S3-compatible access key | `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` |
| `R2_SECRET_ACCESS_KEY` | R2 secret | `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` |
| `R2_BUCKET` | Private bucket name | `karmakoders-sign-prod` |

Optional if needed by the SDK: `R2_ENDPOINT` = `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`.

## Rate limit

| Name | Purpose | Example format |
|---|---|---|
| `UPSTASH_REDIS_REST_URL` | Upstash REST URL | `https://us1-xxx.upstash.io` |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash REST token | `AXxxxx...` |

## Jobs

| Name | Purpose | Example format |
|---|---|---|
| `INNGEST_EVENT_KEY` | Send events | `xxxxxxxx` |
| `INNGEST_SIGNING_KEY` | Verify Inngest requests to the serve route | `signkey-prod-...` |

## PDF service

| Name | Purpose | Example format |
|---|---|---|
| `PDF_SERVICE_URL` | Render base URL (no trailing slash) | `https://karmakoders-pdf.up.railway.app` |
| `PDF_SERVICE_SECRET` | HMAC shared secret | `base64:cGRmX2htYWNfc2VjcmV0XzMyYnl0ZXNtaW4=` |

## Email

| Name | Purpose | Example format |
|---|---|---|
| `RESEND_API_KEY` | Resend API key | `re_xxxxxxxx` |
| `EMAIL_FROM` | From header | `KarmaKoders Sign <sign@karmakoders.com>` |

## Paddle

| Name | Purpose | Example format |
|---|---|---|
| `PADDLE_API_KEY` | Server API key | `pdl_live_...` / `pdl_sdbx_...` |
| `PADDLE_WEBHOOK_SECRET` | Webhook signature | `pdl_ntfset_...` |
| `NEXT_PUBLIC_PADDLE_CLIENT_TOKEN` | Browser client token | `live_...` / `test_...` |
| `NEXT_PUBLIC_PADDLE_ENV` | `sandbox` or `production` | `sandbox` |
| `PADDLE_PRICE_CREDITS_10` | Price ID — 10 credits $10 | `pri_01hxxxxxxxxxxxxxxxxxxxxx` |
| `PADDLE_PRICE_CREDITS_30` | Price ID — 30 credits $25 | `pri_01hxxxxxxxxxxxxxxxxxxxxx` |
| `PADDLE_PRICE_SIGN_PRO_MONTHLY` | Sign Pro $15/mo | `pri_01hxxxxxxxxxxxxxxxxxxxxx` |
| `PADDLE_PRICE_SIGN_PRO_YEARLY` | Sign Pro $150/yr | `pri_01hxxxxxxxxxxxxxxxxxxxxx` |
| `PADDLE_PRICE_ALL_ACCESS_MONTHLY` | All Access $29/mo | `pri_01hxxxxxxxxxxxxxxxxxxxxx` |
| `PADDLE_PRICE_ALL_ACCESS_YEARLY` | All Access $290/yr | `pri_01hxxxxxxxxxxxxxxxxxxxxx` |

## Observability and staff

| Name | Purpose | Example format |
|---|---|---|
| `SENTRY_DSN` | Next.js (and optionally shared with PDF service) | `https://examplePublicKey@o0.ingest.sentry.io/0` |
| `NEXT_PUBLIC_POSTHOG_KEY` | PostHog project key | `phc_xxxxxxxx` |
| `NEXT_PUBLIC_POSTHOG_HOST` | PostHog ingest host | `https://us.i.posthog.com` |
| `ADMIN_EMAILS` | Comma-separated staff emails allowed for `/admin/sign` in addition to permission `sign:admin` | `ops@karmakoders.com,founder@karmakoders.com` |

## Local vs production

- Sandbox Paddle + sandbox price IDs in preview deployments.
- Separate R2 bucket and encryption key per environment; **same Neon project pattern as today** (preview vs prod `DATABASE_URL`).
- Never point preview at the production R2 bucket.

## Related existing vars (do not remove)

`DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `UPLOADTHING_TOKEN` remain required for the rest of karmakoders.com. UploadThing stays CMS-only; Sign uses R2.
