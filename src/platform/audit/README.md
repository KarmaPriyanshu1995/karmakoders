# platform/audit

Append-only product evidence events for e-sign (opens, OTPs, signatures, voids, hashes).
Separate from CMS `src/lib/audit.ts` / `AuditLog` — never write Sign evidence there.

- `appendAuditEvent(input, tx?)` — the only writer for `sign_audit_events`. Locks the document
  row, assigns the next gap-free `sequence`, chains `prevHash` and computes `hash`
  (SHA-256 over canonical fields). Pass the caller's `tx` so the event commits with the state
  change it records.
- Metadata keys with sensitive names (`token`, `code`, `otp`, `secret`, …) throw: link tokens
  and OTP codes never become evidence.
- `computeAuditHash` / `verifyAuditChain` — pure helpers for tests and the audit certificate.
