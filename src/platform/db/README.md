# platform/db

Re-exports the shared Prisma client (`DATABASE_URL` / Neon) for `Platform*` and `Sign*` queries.
Sign and billing code should import from here — not couple to CMS `User`, `Membership`, `Tenant`, or `AuditLog`.
