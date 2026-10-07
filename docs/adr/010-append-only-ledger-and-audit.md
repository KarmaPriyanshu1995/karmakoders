# ADR 010 — Append-only ledger and audit trail enforced in Postgres

Date: 2026-10-04  
Status: Accepted

## Context

Three tables are records of fact, not working state:

- `platform_credit_ledger`: every credit purchase, spend, refund and admin grant. Money disputes and chargebacks are settled against it.
- `sign_audit_events`: the e-sign evidence behind the audit certificate (PRD S9), hash-chained per document.
- `platform_admin_actions`: what KarmaKoders staff did to customer data (PRD S11).

If any of these rows could be edited or deleted, the certificate and billing history would stop being trustworthy. Application code alone can't guarantee that. A bug, a careless script, an admin "fix" or a compromised server process could all issue an `UPDATE`.

## Decision

Enforce append-only behaviour **in Postgres**, not only in app code:

1. A trigger function `kk_forbid_mutation()` raises `restrict_violation` (SQLSTATE 23001). Row-level `BEFORE UPDATE OR DELETE` triggers and statement-level `BEFORE TRUNCATE` triggers attach it to all three tables.
2. **Corrections are new rows.** A wrong credit grant gets a compensating `ADMIN_REVOKE` or `REFUND` entry; a wrong audit event is followed by a new event that explains it.
3. **Foreign keys pointing at these rows' parents use `ON DELETE RESTRICT`**, and parents are soft-deleted (`deleted_at`), so no cascade ever tries to delete evidence.
4. **Integrity beyond immutability:**
   - The ledger has `delta <> 0`, `balance_after >= 0` and a unique `idempotency_key`.
   - The cached `platform_customers.credits_balance >= 0` is updated in the same transaction as the ledger insert.
   - Audit events carry a gap-free `sequence` (unique per document), `prev_hash` and `hash` (SHA-256 over canonical fields + `prev_hash`), so any change in the chain shows up.
5. **Staff identity is stored as a plain NextAuth user id** (`staff_user_id`, `created_by_staff_id`), with no foreign key to the CMS `User`, keeping the Sign/Platform boundary from ADR 002.

## Consequences

Positive:

- Billing history and e-sign evidence stay trustworthy even if the application misbehaves.
- Idempotent webhooks and sends are enforced by unique keys, not by code paths.
- Auditors can rebuild any balance from the ledger alone.

Negative:

- **Deleting these rows needs a deliberate path.** Purging after the 7-year retention requires a reviewed migration or job that temporarily disables the trigger (`ALTER TABLE … DISABLE TRIGGER`) for a single logged run. That needs table-owner privileges, which the runtime role shouldn't have in production.
- Integration tests reset these tables through a test-only helper (`resetPlatformSignTables`) that disables the TRUNCATE guards inside one transaction. It refuses to run in production or preview.
- Writers must compute `sequence` and `hash` inside the same transaction, which serialises audit writes per document. That's acceptable at our volume.
- Prisma can't express triggers or CHECKs, so they live in a hand-written migration (`20261004090100_platform_sign_db_protections`) that must stay in step with the schema.

Rejected alternatives:

- **App-only enforcement** (no `update`/`delete` calls in code): bypassed by any script, admin tool or bug.
- **Revoking UPDATE/DELETE from the app role:** a good additional layer, but Neon branches and Prisma migrations share one role today. Triggers work for every role, including the owner, and survive role misconfiguration. Role separation can be added later on top.
- **An external append-only store (e.g. a ledger service or WORM bucket):** more infrastructure for v1, and we'd lose transactional consistency with the balance and document status.
