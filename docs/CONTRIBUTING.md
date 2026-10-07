# Contributing

Project rules live in [`CLAUDE.md`](../CLAUDE.md) and the docs in this folder (PRD, ARCHITECTURE, ADRs, ENV, DATABASE). This file covers day-to-day checks for pull requests.

## Before opening a pull request

```bash
npm run lint        # ESLint, using eslint-suppressions.json
npm run typecheck   # tsc --noEmit
npm run test        # Vitest: "unit" project first, then the "integration" project (one file at a time)
```

- Local development and tests use `.env.local` pointing to the **Neon dev branch** ([ENV.md](./ENV.md)).
- **Integration tests clear dev data** in `platform_*` and `sign_*` tables (never CMS tables, never `sign_early_access`).
- Never run `prisma migrate dev` or `prisma migrate reset` against production.
- CI (`.github/workflows/ci.yml`, on PRs and pushes to `main` and `staging`) runs lint, typecheck, migrations, tests and `next build` against a disposable `postgres:16` container.
- Review every `DROP` in a new migration. `prisma migrate deploy` runs in the Vercel build, so a merged migration reaches production.

## Lint suppressions (`eslint-suppressions.json`)

The repo had ESLint errors in files that predate the current rules. Instead of disabling rules or blocking every PR, those existing errors are recorded in `eslint-suppressions.json` (ESLint [bulk suppressions](https://eslint.org/docs/latest/use/suppressions)). Any **new** error, in any file, still fails `npm run lint` and CI.

**The suppressions file must only shrink.**

- **Fixing a suppressed problem removes it from the file.** After fixing, run:

  ```bash
  npx eslint . --prune-suppressions
  ```

  Commit the smaller `eslint-suppressions.json` with your fix. ESLint reports suppressions that no longer match anything, so stale entries are visible.
- **Adding a suppression is the exception.** Only use `npx eslint <file> --suppress-rule <rule>` or `--suppress-all` when there is no reasonable fix in the PR's scope. The PR description must include a **written reason** for each new suppression (file, rule, why it can't be fixed now, and the follow-up). Reviewers should reject a PR that grows the file without one.
- **Never** disable a rule in `eslint.config.mjs` or add `eslint-disable` comments to get a PR green.
- Warnings aren't suppressed; they're shown but don't fail lint. Don't add new ones.
- Ignored paths (`scratch/**`, `scripts/**`, root `scratch-*` files) are one-off local scripts, not shipped code. Don't move product code there.
