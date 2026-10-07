-- =============================================================================
-- Task 4A: database-level protections for Platform + Sign.
-- Hand-written (Prisma cannot express CHECK constraints or triggers in the schema).
-- Rationale for each rule: docs/DATABASE.md and docs/adr/010-append-only-ledger-and-audit.md.
-- These rules hold even if application code has a bug or someone runs SQL by hand.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- CHECK constraints
-- ---------------------------------------------------------------------------

-- A customer can never spend credits they do not have. The cached balance is updated in the
-- same transaction as the ledger insert; a negative result aborts that transaction.
ALTER TABLE "platform_customers"
  ADD CONSTRAINT "platform_customers_credits_balance_non_negative"
  CHECK ("credits_balance" >= 0);

-- A zero-delta ledger row carries no meaning and would hide bugs (e.g. a "spend" of 0).
ALTER TABLE "platform_credit_ledger"
  ADD CONSTRAINT "platform_credit_ledger_delta_non_zero"
  CHECK ("delta" <> 0);

-- The running balance recorded on each ledger row must never go negative either.
ALTER TABLE "platform_credit_ledger"
  ADD CONSTRAINT "platform_credit_ledger_balance_after_non_negative"
  CHECK ("balance_after" >= 0);

-- Free-tier counters only count up from zero; a negative value would grant extra free sends.
ALTER TABLE "platform_usage"
  ADD CONSTRAINT "platform_usage_free_used_non_negative"
  CHECK ("free_used" >= 0);

-- Payment totals are integer cents and never negative (refunds are a status, not a negative row).
ALTER TABLE "platform_payments"
  ADD CONSTRAINT "platform_payments_amount_total_cents_non_negative"
  CHECK ("amount_total_cents" >= 0);

-- Field geometry is stored as fractions of the page so it is independent of render size.
-- Values outside 0..1 would place fields off-page on the final PDF.
ALTER TABLE "sign_fields"
  ADD CONSTRAINT "sign_fields_x_fraction" CHECK ("x" BETWEEN 0 AND 1),
  ADD CONSTRAINT "sign_fields_y_fraction" CHECK ("y" BETWEEN 0 AND 1),
  ADD CONSTRAINT "sign_fields_width_fraction" CHECK ("width" BETWEEN 0 AND 1),
  ADD CONSTRAINT "sign_fields_height_fraction" CHECK ("height" BETWEEN 0 AND 1);

-- ---------------------------------------------------------------------------
-- Append-only tables
-- ---------------------------------------------------------------------------

-- Shared trigger function: any attempt to change or remove an existing row raises.
-- SQLSTATE 23001 (restrict_violation) so callers can recognise it as an integrity error.
CREATE OR REPLACE FUNCTION "kk_forbid_mutation"() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION '% is append-only: % is not allowed', TG_TABLE_NAME, TG_OP
    USING ERRCODE = 'restrict_violation';
END;
$$;

-- E-sign evidence: events are hash-chained per document; editing or deleting one would
-- break the tamper-evident trail shown on the audit certificate.
CREATE TRIGGER "sign_audit_events_append_only"
  BEFORE UPDATE OR DELETE ON "sign_audit_events"
  FOR EACH ROW EXECUTE FUNCTION "kk_forbid_mutation"();

-- Credit ledger: every credit change is a new row (corrections are compensating entries),
-- so balances can always be reconstructed and audited.
CREATE TRIGGER "platform_credit_ledger_append_only"
  BEFORE UPDATE OR DELETE ON "platform_credit_ledger"
  FOR EACH ROW EXECUTE FUNCTION "kk_forbid_mutation"();

-- Staff actions: support activity must not be editable by the staff who performed it.
CREATE TRIGGER "platform_admin_actions_append_only"
  BEFORE UPDATE OR DELETE ON "platform_admin_actions"
  FOR EACH ROW EXECUTE FUNCTION "kk_forbid_mutation"();

-- TRUNCATE bypasses row-level triggers, so block it with statement-level triggers too.
-- (Added beyond the original brief: without it the append-only guarantee has a hole.)
CREATE TRIGGER "sign_audit_events_no_truncate"
  BEFORE TRUNCATE ON "sign_audit_events"
  FOR EACH STATEMENT EXECUTE FUNCTION "kk_forbid_mutation"();

CREATE TRIGGER "platform_credit_ledger_no_truncate"
  BEFORE TRUNCATE ON "platform_credit_ledger"
  FOR EACH STATEMENT EXECUTE FUNCTION "kk_forbid_mutation"();

CREATE TRIGGER "platform_admin_actions_no_truncate"
  BEFORE TRUNCATE ON "platform_admin_actions"
  FOR EACH STATEMENT EXECUTE FUNCTION "kk_forbid_mutation"();
