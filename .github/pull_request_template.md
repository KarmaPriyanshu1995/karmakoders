## What and why

<!-- What does this PR change, and why? Link the task / issue. -->

## Checklist

- [ ] **Tests added or updated** for every behaviour this PR adds or changes
- [ ] `npm run lint` and `npm run typecheck` pass locally
- [ ] `npm run test` passes locally (integration tests clear dev data in `platform_*` / `sign_*`)
- [ ] **No secrets committed**: real values live only in `.env.local` (git-ignored, never committed); the only committed env file is the `.env.example` template with empty values; no keys, tokens or real URLs in code, tests or docs
- [ ] **Migrations reviewed**, including **every `DROP`** (table, column, type, constraint), because `prisma migrate deploy` runs in the Vercel build and reaches production. Write "no migrations" if none.
- [ ] `eslint-suppressions.json` did not grow, or each new suppression has a written reason below ([CONTRIBUTING](../docs/CONTRIBUTING.md))
- [ ] **Screenshots** for UI changes (desktop and mobile)

## Migrations

<!-- List each new migration and every DROP / destructive statement, or "None". -->

## New lint suppressions

<!-- File, rule, why it can't be fixed in this PR, follow-up. Or "None". -->

## Screenshots

<!-- UI changes only. -->
