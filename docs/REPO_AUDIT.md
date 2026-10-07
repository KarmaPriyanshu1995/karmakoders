# Repo audit — karmakoders.com

Audit date: 2026-09-29. Scope: this Next.js repository only. No application code was changed.

## 1. Runtime and language

| Item | Finding |
|---|---|
| Framework | **Next.js 16.2.6** (App Router). `src/app/` is the route tree. No `pages/` directory. |
| React | 19.2.4 |
| Language | **TypeScript 5**. `strict: true`. Path alias `@/*` → `./src/*`. |
| Package manager | **npm** (`package-lock.json` lockfileVersion 3). No pnpm/yarn lockfile. |
| Breaking-change note | `AGENTS.md` warns this Next.js release differs from older training data. Request interception lives in `src/proxy.ts`, **not** `middleware.ts`. |

## 2. Folder structure (top three levels)

```
karmakoders/
├── prisma/                 schema, migrations, seeds
├── public/                 static assets, robots.txt
├── scripts/                one-off CMS/QA scripts
├── scratch/                local DB/debug scripts (not production)
├── src/
│   ├── app/                App Router: (public), (admin), api/, go/
│   ├── components/         site, admin, tools, ui, sections, content
│   ├── hooks/
│   ├── lib/                prisma, auth, permissions, seo, tools, audit
│   ├── store/              zustand (tenant, theme)
│   └── types/
├── tests/                  integration / tenant isolation
├── next.config.ts
├── vercel.json
├── vitest.config.mts
└── package.json
```

There is **no** `src/platform/`, `src/modules/`, or public `/tools` tree today.

### Styling and UI

- **Tailwind CSS v4** via `@tailwindcss/postcss` and `@import "tailwindcss"` in `src/app/globals.css`.
- Plugin: `@tailwindcss/typography`.
- Brand tokens in use: `#252422`, `#1C1B1A`, `#FFC300`, `#FFFFFF`, `#A39F97`.
- UI kits in `src/components/ui/`: Button (CVA + Radix Slot), Card, a scroll animation demo. Not a full shadcn install.
- Other UI: `lucide-react`, `framer-motion`, `sonner`, `@dnd-kit/*`, TipTap, Three.js / R3F, mermaid.

## 3. APIs, auth, database, env

### API routes (`src/app/api/` and `src/app/go/`)

| Path | Role |
|---|---|
| `/api/auth/[...nextauth]` | NextAuth v4 credentials (CMS admin) |
| `/api/uploadthing` | UploadThing file router (admin images + CV PDFs) |
| `/api/tools/events` | Free-tools analytics ingest |
| `/api/domain/compare` | Domain compare |
| `/api/content/view` | Content view counting |
| `/api/pages/[id]/sections` | CMS sections |
| `/api/seo/*` | SEO intelligence APIs (many) |
| `/api/admin/ai/analyze-design` | Admin AI helper |
| `/go/domain-provider/[provider]` | Affiliate redirect |

**Not present:** `/api/billing`, `/api/webhooks`, `/api/webhooks/paddle`, `/api/tools/sign`.

### Request proxy (Next.js 16 stand-in for middleware)

`src/proxy.ts` matcher: `/admin/:path*`, `/login`.

- Unauthenticated visitors to `/admin/*` redirect to `/admin/login`.
- `/login` redirects to `/admin/login`.
- `/admin/platform` requires `token.isSuperAdmin`.
- NextAuth JWT via `NEXTAUTH_SECRET`.

Public marketing pages and `/api/*` are **not** behind this proxy.

### Auth

- **next-auth@4** Credentials provider, JWT sessions, bcrypt passwords.
- Users live in Prisma `User`; access is **tenant membership** (`Membership` + `Tenant`).
- Sign-in page is `/admin/login`. This is staff/CMS auth, not a customer product login.
- No passwordless OTP, magic links, or signer tokens.

### Database

- **PostgreSQL** via **Prisma 7** + `@prisma/adapter-pg` + `pg` Pool.
- Comments and retry logic target **Neon** cold starts (`P1001`/`P1002`).
- `DATABASE_URL` is required at runtime. Build allows a missing URL.
- Multi-tenant CMS/SEO/free-tools schema. No Sign, wallet, credits, or document models.
- **No MongoDB / Mongoose.**

### Storage, email, jobs, billing

| Concern | Today |
|---|---|
| Files | UploadThing (public-ish CDN URLs). 4 MB image / 4 MB PDF CV. |
| Email | `src/lib/email.ts` only normalizes addresses. **No sender.** |
| Rate limit | In-memory `Map` in `src/lib/tools/rate-limit.ts` (not multi-instance safe). |
| Jobs | None (no Inngest, no cron routes, no queues). |
| Payments | None. |
| Audit | CMS `AuditLog` + `src/lib/audit.ts` (admin actions, not e-sign evidence). |

### Environment variables in use (names only)

`DATABASE_URL`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `UPLOADTHING_TOKEN`, `NEXT_PUBLIC_SITE_URL`, `VERCEL_URL`, `NEXT_PUBLIC_IMAGE_COMPRESSOR_API`, `NEXT_PUBLIC_CAL_URL`, `NEXT_PUBLIC_WHATSAPP_NUMBER`, `FX_RATES_JSON`, `HOSTINGER_API_TOKEN`, `HOSTINGER_API_BASE_URL`, `HOSTINGER_CATALOG_PREFIX`, `GODADDY_PAT`, `GODADDY_API_KEY`, `GODADDY_API_SECRET`, `GODADDY_API_BASE_URL`, `PORKBUN_API_KEY`, `PORKBUN_SECRET_KEY` / `PORKBUN_API_SECRET`, `NAMECHEAP_API_USER`, `NAMECHEAP_API_KEY`, `NAMECHEAP_USERNAME`, `NAMECHEAP_CLIENT_IP`, `NAMECHEAP_API_URL`.

Google Analytics measurement ID is **hardcoded** in `src/app/layout.tsx` (`G-NG3CPDVF6F`), not env-driven.

## 4. Hosting and deploy

| Artifact | Finding |
|---|---|
| `vercel.json` | Present; empty besides the Vercel JSON schema. Confirms Vercel. |
| Dockerfile | **None** |
| GitHub Actions | **None** |
| `package.json` `build` | `prisma generate && prisma migrate deploy && next build` |
| `next.config.ts` | Apex → www redirect, a few canonical redirects, security headers, image remote patterns (Unsplash, UploadThing, Pexels). `allowedDevOrigins` includes localhost. |

Image compressor is a **separate FastAPI** service, not this repo.

## 5. Lint, format, TypeScript, tests

| Tool | Finding |
|---|---|
| ESLint | Flat config `eslint.config.mjs` — `eslint-config-next` core-web-vitals + typescript. |
| Prettier | **No** config or script. |
| tsconfig | `strict: true`. `allowJs: true`. `skipLibCheck: true`. Excludes `prisma/`, `scratch/`, `scripts/`. |
| Tests | **Vitest 4**. `src/**/*.test.ts` and `tests/**/*.test.ts`. ~22 test files: permissions, tenant isolation, SEO route security, free-tools, content. No Playwright/Cypress E2E. |
| Scripts | `lint`, `test` (`vitest run`), `typecheck`. |

## 6. Route and naming conflicts

| Proposed Sign path | Status | Notes |
|---|---|---|
| `/tools` | **Soft conflict** | No `src/app/tools` today. Catch-all `src/app/(public)/[slug]/page.tsx` treats `tools` as a CMS/SEO landing slug and 404s if unpublished. Adding `src/app/tools/sign/...` **wins** for `/tools/sign/*`. Bare `/tools` still hits `[slug]` unless a dedicated page is added. |
| `/tools/sign` | **Free** | No existing file. Distinct from `/free-tools` and `/free-tools/[slug]`. |
| `/admin` | **Hard conflict** | Full CMS admin already lives at `/admin` (`src/app/(admin)/admin/...`), gated by NextAuth. Cannot replace it. |
| `/api/auth` | **Hard conflict** | `src/app/api/auth/[...nextauth]/route.ts` is a **catch-all**. `/api/auth/otp` would be handled by NextAuth, not Sign. |
| `/api/billing` | **Free** | Does not exist. |
| `/api/webhooks` | **Free** | Does not exist. `/api/webhooks/paddle` is available. |
| `/api/tools` | **Prefix in use** | `/api/tools/events` exists. `/api/tools/sign/...` is a sibling and is **OK**. |
| `/login` | Occupied | Proxy redirects `/login` → `/admin/login`. Sign login should stay under `/tools/sign/login`. |
| `src/lib/tools/` | Name clash | Free-tools domain/compress/MVP logic. Do **not** put Sign code here. |
| `src/lib/audit.ts` | Name clash | CMS audit, not e-sign trail. Sign audit must be a separate module. |
| `/admin/tools` | Occupied | CMS UI for **free tools** catalog, not Sign product admin. |

## 7. Risks, blockers, recommended fixes (do not apply)

### Highest risks — resolved by decision

1. **Two databases / MongoDB.** ~~Would have split backups and pools.~~ **Resolved by decision:** reuse existing Neon PostgreSQL via Prisma 7 with `Platform*` / `Sign*` models — [ADR 002](./adr/002-postgres-prisma.md). Never reference CMS `User`, `Membership`, `Tenant`, or `AuditLog` from Sign.

2. **`/api/auth/*` is owned by NextAuth catch-all.** ~~OTP under `/api/auth` would be swallowed.~~ **Resolved by decision:** customer OTP at `/api/platform/auth/*`, cookie `kk_session`, helpers in `src/platform/auth`, never `getServerSession` for customers — [ADR 006](./adr/006-passwordless-otp.md).

3. **`/admin` is the CMS.** ~~Cannot replace CMS admin.~~ **Resolved by decision:** Sign staff UI at `/admin/sign` with NextAuth + permission `sign:admin`; customers never use `/admin` — [ADR 006](./adr/006-passwordless-otp.md). Request gate remains `src/proxy.ts`.

4. **Vercel serverless is the wrong place to run Puppeteer.** ~~Timeouts and missing Chrome.~~ **Resolved by decision:** separate Docker + Puppeteer PDF service called over HTTPS with HMAC — [ADR 003](./adr/003-pdf-render-service.md).

5. **No durable queue or email.** ~~In-request send would fail on Vercel.~~ **Resolved by decision:** Inngest for background jobs + Resend for email — [ADR 004](./adr/004-inngest.md).

6. **UploadThing is not private encrypted object storage.** ~~Public CDN URLs unsuitable for signed PDFs.~~ **Resolved by decision:** private Cloudflare R2 with AES-256-GCM; never UploadThing for Sign — [ADR 007](./adr/007-r2-encryption.md). Rate limits use Upstash in `src/platform/rate-limit` (not the in-memory free-tools helper).

### Medium

7. **Catch-all `[slug]`.** Before launch, reserve `tools` so a CMS page cannot occupy it. **Decision:** add `src/app/tools/page.tsx` redirecting to `/tools/sign` (see [ARCHITECTURE.md](./ARCHITECTURE.md)).

8. **In-memory rate limit** breaks on multiple Vercel instances. **Decision:** Upstash Redis via `src/platform/rate-limit` ([ADR 007](./adr/007-r2-encryption.md) stack / architecture).

9. **10 MB+ PDF uploads** vs Vercel body limits. Stream to R2 from the client (presigned) or via the PDF service; do not `FormData` a 25 MB file through a Server Action if the limit is lower.

10. **NextAuth v4 vs OTP sessions.** Two cookie names (`kk_session` vs NextAuth). Never call `getServerSession(authOptions)` for Sign customers. Isolate `src/platform/auth` — [ADR 006](./adr/006-passwordless-otp.md).

11. **Root layout** injects marketing fonts, theme CSS, and Google Analytics on **every** page including future Sign routes unless Sign uses a nested layout that minimizes chrome. **Recommendation:** Sign route group with its own layout; keep Navbar/Footer opt-in.

12. **No Sentry / PostHog / zod (direct).** Zod exists only as a transitive dep. Add them as first-party dependencies in a later task.

13. **Legal / compliance.** ESIGN/UETA and eIDAS “simple electronic signature” only. Blocked document types must be in product copy and send-time validation, not just the PRD.

### Low

14. Empty `vercel.json` is fine; later add `crons` only if Inngest is not used for schedules.
15. Prettier is unused; optional for Sign module consistency.
16. `src/lib/tools` vs `src/modules/sign` vs future `/tools/*` products: keep **free tools** at `/free-tools` and **paid products** at `/tools/<product>`.

## Recommended folder mapping (for later tasks)

Adapt the architecture plan to **this** repo (always under `src/`):

```
src/platform/                 shared Sign+future-tools services
src/modules/sign/             Sign domain + UI
src/app/tools/page.tsx        redirect → /tools/sign
src/app/tools/sign/           Sign pages (App Router)
src/app/api/tools/sign/       Sign APIs
src/app/api/platform/auth/    OTP (NOT /api/auth); cookie kk_session
src/app/api/billing/          wallet + Paddle client routes
src/app/api/webhooks/paddle/  Paddle webhooks
src/app/(admin)/admin/(dashboard)/sign/   staff admin at /admin/sign (sign:admin)
src/proxy.ts                  Next.js 16 request interception
```

Do not put Sign code in `src/lib/tools/`. Do not reuse CMS `User` / `Membership` / `Tenant` / `AuditLog`. Use Prisma models prefixed `Platform*` and `Sign*` on the existing `DATABASE_URL` cluster.
