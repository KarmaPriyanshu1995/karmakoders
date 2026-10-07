# ADR 009 — Sign admin nested under existing /admin

Date: 2026-10-07  
Status: Accepted

## Context

Staff need a basic Sign admin (PRD S11): searchable senders, document status, Paddle transactions, credit balances, and a list of failed webhooks with retry.

`/admin` already exists as the **CMS admin** (`src/app/(admin)/admin/(dashboard)/…`). It uses NextAuth staff login, a tenant-aware permission matrix in `src/lib/permissions.ts`, a sidebar layout, and `src/proxy.ts`, which redirects unauthenticated `/admin/*` requests to `/admin/login`. The repo audit lists `/admin` as a hard conflict: it can't be replaced, and customers must never use it.

The options were a separate admin app or URL space (e.g. `/tools/sign/admin`, `admin.karmakoders.com`), or a section inside the existing admin.

## Decision

Sign's staff UI lives **inside the existing admin** at **`/admin/sign`**:

- **Route:** `src/app/(admin)/admin/(dashboard)/sign/`, so it inherits the CMS admin layout and the `src/proxy.ts` NextAuth gate with no new interception code.
- **Authentication:** existing NextAuth staff sessions only. `kk_session` (customers) is never accepted here ([ADR 008](./008-customer-auth-separate-from-cms.md)).
- **Authorisation:** a dedicated permission, **`sign:admin`**, checked server-side on every Sign admin page, server action and API.
  - `ADMIN_EMAILS` is an additional allow-list, not a replacement for the permission ([ENV.md](../ENV.md)).
  - Being a CMS tenant admin does **not** imply `sign:admin`.
  - The CMS matrix in `src/lib/permissions.ts` uses uppercase constants (`BLOG_VIEW`, …), so the permission still has to be added there, e.g. `SIGN_ADMIN` mapped to `sign:admin`. That's part of the admin task.
- **Data access:** Sign admin reads and writes only `Platform*` / `Sign*` tables through `src/platform/*` and `src/modules/sign/*`. It never joins CMS `User`, `Membership`, `Tenant` or `AuditLog`.
- **Accountability:** every Sign admin mutation (webhook retry, credit grant/revoke, void exception, refund note) writes an append-only `platform_admin_actions` row with the NextAuth user id as a plain string ([ADR 010](./010-append-only-ledger-and-audit.md)).
- `/admin/tools` remains the CMS **free-tools** catalog and is unrelated to Sign.

## Consequences

Positive:

- One staff login, one layout, one proxy gate; no new auth surface.
- Staff find Sign support tools where they already work.
- The permission plus allow-list keep Sign data visible only to people who need it.

Negative:

- Sign admin shares a deploy and layout with the CMS, so CMS admin regressions can affect Sign support.
- The permission model is tenant-scoped while Sign data is global; `sign:admin` must be checked as a global (non-tenant) grant, and tests must show a tenant admin without it is refused.
- Sign admin pages must avoid importing CMS domain helpers so the bounded context in ADR 002 stays intact.

Rejected alternatives:

- **Separate admin app or subdomain:** a second staff login and deploy for a small v1 surface.
- **Admin under `/tools/sign/admin`:** mixes staff and customer route trees and would need a second gate in `src/proxy.ts`.
