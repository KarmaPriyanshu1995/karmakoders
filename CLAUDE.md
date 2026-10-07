@AGENTS.md

# KarmaKoders - project rules for Claude Code

## Read first
Before any task, read docs/PRD.md, docs/ARCHITECTURE.md, docs/adr/, docs/ENV.md and
docs/REPO_AUDIT.md. They are the source of truth. If a task conflicts with them, stop and ask.

## Stack (do not change)
- Next.js 16 App Router in src/app, React 19, TypeScript strict, npm.
- Request interception is src/proxy.ts, NOT middleware.ts.
- Tailwind v4. Sign UI components from shadcn live in src/components/product-ui.
  Never modify src/components/ui (existing site components).
- Prisma 7 + PostgreSQL (Neon) via @prisma/adapter-pg. No MongoDB, no Mongoose.
- Vitest for tests. zod for all input validation.

## Boundaries
- Shared services: src/platform/*. Sign product: src/modules/sign/*.
  Sign pages: src/app/tools/sign/*. Sign APIs: src/app/api/tools/sign/*.
- Customer auth: src/platform/auth, routes /api/platform/auth/*, cookie kk_session.
  Never use NextAuth or getServerSession for customers. /api/auth is NextAuth's.
- Staff admin for Sign: /admin/sign, NextAuth + permission "sign:admin".
- Never put Sign code in src/lib/tools or src/lib/audit.ts.
- Never reference or modify CMS models: User, Membership, Tenant, AuditLog.
- Sign files: private Cloudflare R2 with AES-256-GCM only. Never UploadThing.
- Rate limiting uses Upstash via src/platform/rate-limit. An in-memory limiter is allowed ONLY
  when NODE_ENV is 'development' or 'test'. In production, missing Upstash config throws at first
  use, and Upstash runtime errors fail CLOSED (deny) for auth, OTP and signing endpoints.
- Pricing and plans: only from src/platform/billing/plans.ts.
- Slugs in src/modules/sign/templates/catalog.ts are canonical.

## Engineering rules
- Money is integer cents. Credits are integers. Never floats.
- Every write that changes credits, document status or payments runs in a DB transaction.
- Every webhook and payment operation is idempotent.
- Never log secrets, tokens, OTP codes or document contents.
- Validate env per feature via src/platform/env; never validate at import/build time.
- Server-only modules import "server-only".
- Add or update tests for every behaviour you add.

## Workflow
- Start every task in plan mode. Present the plan, wait for approval, then implement.
- After implementing: run npm run lint, npm run typecheck, npm run test. Fix failures in
  files you touched. Never disable a lint rule or skip a test to make checks pass.
- Never run prisma migrate dev or migrate reset against production. Only against the
  DATABASE_URL of the Neon dev branch.
- End every task by printing: files created, files modified, migrations added,
  anything you could not do, and anything I must do manually.