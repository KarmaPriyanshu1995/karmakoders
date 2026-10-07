-- =============================================================================
-- Task 4A: Platform + Sign schema (create-only).
--
-- Creates 20 enums, 16 tables, their indexes and foreign keys. Contains NO DROP statements
-- and does not alter any existing table: no CMS object (User, Membership, Tenant, AuditLog, ...)
-- and no table created outside Prisma migrations (e.g. sign_early_access) is touched.
-- The never-deployed draft migration 20260930180000_platform_sign_foundation was removed
-- before merge, so production only ever sees CREATE statements.
--
-- Generated offline with `prisma migrate diff` (committed schema -> final schema).
-- DB-level CHECKs and append-only triggers follow in 20261004090100_platform_sign_db_protections.
-- =============================================================================

-- CreateEnum
CREATE TYPE "platform_customer_status" AS ENUM ('ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "platform_otp_purpose" AS ENUM ('LOGIN', 'SIGNER');

-- CreateEnum
CREATE TYPE "platform_subscription_product" AS ENUM ('SIGN_PRO', 'ALL_ACCESS');

-- CreateEnum
CREATE TYPE "platform_billing_interval" AS ENUM ('MONTH', 'YEAR');

-- CreateEnum
CREATE TYPE "platform_subscription_status" AS ENUM ('ACTIVE', 'TRIALING', 'PAST_DUE', 'PAUSED', 'CANCELED');

-- CreateEnum
CREATE TYPE "platform_ledger_reason" AS ENUM ('PURCHASE', 'USAGE', 'REFUND', 'CHARGEBACK', 'ADMIN_GRANT', 'ADMIN_REVOKE');

-- CreateEnum
CREATE TYPE "platform_payment_status" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'PAST_DUE', 'REFUNDED', 'PARTIALLY_REFUNDED', 'CHARGEBACK');

-- CreateEnum
CREATE TYPE "platform_webhook_status" AS ENUM ('RECEIVED', 'PROCESSED', 'FAILED', 'IGNORED');

-- CreateEnum
CREATE TYPE "platform_tool" AS ENUM ('SIGN');

-- CreateEnum
CREATE TYPE "sign_template_category" AS ENUM ('NDA', 'CONTRACTOR', 'HR', 'CONSENT', 'CERTIFICATE');

-- CreateEnum
CREATE TYPE "sign_document_source" AS ENUM ('TEMPLATE', 'UPLOAD');

-- CreateEnum
CREATE TYPE "sign_document_status" AS ENUM ('DRAFT', 'SENT', 'PARTIALLY_SIGNED', 'COMPLETED', 'DECLINED', 'EXPIRED', 'VOIDED');

-- CreateEnum
CREATE TYPE "sign_signing_order" AS ENUM ('PARALLEL', 'SEQUENTIAL');

-- CreateEnum
CREATE TYPE "sign_charged_via" AS ENUM ('FREE', 'CREDIT', 'SUBSCRIPTION');

-- CreateEnum
CREATE TYPE "sign_signer_status" AS ENUM ('PENDING', 'VIEWED', 'SIGNED', 'DECLINED');

-- CreateEnum
CREATE TYPE "sign_signature_method" AS ENUM ('DRAW', 'TYPE', 'UPLOAD');

-- CreateEnum
CREATE TYPE "sign_field_type" AS ENUM ('SIGNATURE', 'INITIALS', 'DATE', 'TEXT', 'CHECKBOX');

-- CreateEnum
CREATE TYPE "sign_file_kind" AS ENUM ('ORIGINAL', 'FINAL', 'LOGO', 'SIGNATURE_IMAGE', 'UPLOAD');

-- CreateEnum
CREATE TYPE "sign_audit_event_type" AS ENUM ('CREATED', 'UPDATED', 'SENT', 'EMAIL_DELIVERED', 'OPENED', 'OTP_SENT', 'OTP_VERIFIED', 'CONSENT_GIVEN', 'VIEWED', 'SIGNED', 'DECLINED', 'REMINDED', 'VOIDED', 'EXPIRED', 'COMPLETED', 'DOWNLOADED', 'VERIFIED');

-- CreateEnum
CREATE TYPE "sign_actor_type" AS ENUM ('SENDER', 'SIGNER', 'SYSTEM', 'STAFF');

-- CreateTable
CREATE TABLE "platform_customers" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "paddle_customer_id" TEXT,
    "credits_balance" INTEGER NOT NULL DEFAULT 0,
    "status" "platform_customer_status" NOT NULL DEFAULT 'ACTIVE',
    "last_login_at" TIMESTAMP(3),
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_sessions" (
    "id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip" TEXT,
    "user_agent" TEXT,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_otps" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "purpose" "platform_otp_purpose" NOT NULL,
    "code_hash" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "consumed_at" TIMESTAMP(3),
    "signer_id" UUID,
    "ip" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_otps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_subscriptions" (
    "id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "paddle_subscription_id" TEXT NOT NULL,
    "product" "platform_subscription_product" NOT NULL,
    "interval" "platform_billing_interval" NOT NULL,
    "paddle_price_id" TEXT NOT NULL,
    "status" "platform_subscription_status" NOT NULL,
    "current_period_start" TIMESTAMP(3),
    "current_period_end" TIMESTAMP(3),
    "scheduled_change" JSONB,
    "canceled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_credit_ledger" (
    "id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "delta" INTEGER NOT NULL,
    "balance_after" INTEGER NOT NULL,
    "reason" "platform_ledger_reason" NOT NULL,
    "tool" "platform_tool",
    "reference_type" TEXT,
    "reference_id" TEXT,
    "paddle_transaction_id" TEXT,
    "idempotency_key" TEXT NOT NULL,
    "created_by_staff_id" TEXT,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_credit_ledger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_usage" (
    "id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "tool" "platform_tool" NOT NULL,
    "period" TEXT NOT NULL,
    "free_used" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_usage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_payments" (
    "id" UUID NOT NULL,
    "paddle_transaction_id" TEXT NOT NULL,
    "customer_id" UUID,
    "status" "platform_payment_status" NOT NULL,
    "origin" TEXT,
    "price_ids" TEXT[],
    "amount_total_cents" INTEGER NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "credits_granted" INTEGER NOT NULL DEFAULT 0,
    "subscription_id" TEXT,
    "occurred_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_webhook_events" (
    "id" UUID NOT NULL,
    "paddle_event_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "occurred_at" TIMESTAMP(3) NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "platform_webhook_status" NOT NULL DEFAULT 'RECEIVED',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "last_error" TEXT,
    "processed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_brands" (
    "id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "company_name" TEXT,
    "logo_file_id" UUID,
    "primary_color" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_brands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_admin_actions" (
    "id" UUID NOT NULL,
    "staff_user_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "target_type" TEXT NOT NULL,
    "target_id" TEXT NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "ip" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_admin_actions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sign_templates" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "category" "sign_template_category" NOT NULL,
    "html" TEXT NOT NULL,
    "fields_schema" JSONB NOT NULL,
    "signer_roles" JSONB NOT NULL,
    "is_premium" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sign_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sign_documents" (
    "id" UUID NOT NULL,
    "public_id" TEXT NOT NULL,
    "owner_id" UUID NOT NULL,
    "template_id" UUID,
    "source" "sign_document_source" NOT NULL,
    "title" TEXT NOT NULL,
    "status" "sign_document_status" NOT NULL DEFAULT 'DRAFT',
    "field_values" JSONB NOT NULL DEFAULT '{}',
    "rendered_html" TEXT,
    "content_hash" TEXT,
    "signing_order" "sign_signing_order" NOT NULL DEFAULT 'PARALLEL',
    "message" TEXT,
    "expires_at" TIMESTAMP(3),
    "link_password_hash" TEXT,
    "reminders_enabled" BOOLEAN NOT NULL DEFAULT true,
    "branding_snapshot" JSONB,
    "charged_via" "sign_charged_via",
    "ledger_entry_id" UUID,
    "sent_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "voided_at" TIMESTAMP(3),
    "void_reason" TEXT,
    "final_file_id" UUID,
    "final_file_hash" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sign_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sign_signers" (
    "id" UUID NOT NULL,
    "document_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "token_hash" TEXT NOT NULL,
    "status" "sign_signer_status" NOT NULL DEFAULT 'PENDING',
    "otp_verified_at" TIMESTAMP(3),
    "consent_at" TIMESTAMP(3),
    "viewed_at" TIMESTAMP(3),
    "signed_at" TIMESTAMP(3),
    "declined_at" TIMESTAMP(3),
    "decline_reason" TEXT,
    "signature_method" "sign_signature_method",
    "signature_file_id" UUID,
    "ip" TEXT,
    "user_agent" TEXT,
    "last_reminded_at" TIMESTAMP(3),
    "reminder_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sign_signers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sign_fields" (
    "id" UUID NOT NULL,
    "document_id" UUID NOT NULL,
    "signer_id" UUID,
    "type" "sign_field_type" NOT NULL,
    "page" INTEGER NOT NULL,
    "x" DOUBLE PRECISION NOT NULL,
    "y" DOUBLE PRECISION NOT NULL,
    "width" DOUBLE PRECISION NOT NULL,
    "height" DOUBLE PRECISION NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "value" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sign_fields_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sign_files" (
    "id" UUID NOT NULL,
    "owner_id" UUID,
    "document_id" UUID,
    "kind" "sign_file_kind" NOT NULL,
    "storage_key" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "sha256" TEXT NOT NULL,
    "encrypted" BOOLEAN NOT NULL DEFAULT true,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sign_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sign_audit_events" (
    "id" UUID NOT NULL,
    "document_id" UUID NOT NULL,
    "signer_id" UUID,
    "type" "sign_audit_event_type" NOT NULL,
    "actor_type" "sign_actor_type" NOT NULL,
    "ip" TEXT,
    "user_agent" TEXT,
    "metadata" JSONB,
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sequence" INTEGER NOT NULL,
    "prev_hash" TEXT,
    "hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sign_audit_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "platform_customers_email_key" ON "platform_customers"("email");

-- CreateIndex
CREATE UNIQUE INDEX "platform_customers_paddle_customer_id_key" ON "platform_customers"("paddle_customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "platform_sessions_token_hash_key" ON "platform_sessions"("token_hash");

-- CreateIndex
CREATE INDEX "platform_sessions_customer_id_idx" ON "platform_sessions"("customer_id");

-- CreateIndex
CREATE INDEX "platform_otps_email_purpose_expires_at_idx" ON "platform_otps"("email", "purpose", "expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "platform_subscriptions_paddle_subscription_id_key" ON "platform_subscriptions"("paddle_subscription_id");

-- CreateIndex
CREATE INDEX "platform_subscriptions_customer_id_status_idx" ON "platform_subscriptions"("customer_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "platform_credit_ledger_idempotency_key_key" ON "platform_credit_ledger"("idempotency_key");

-- CreateIndex
CREATE INDEX "platform_credit_ledger_customer_id_created_at_idx" ON "platform_credit_ledger"("customer_id", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "platform_usage_customer_id_tool_period_key" ON "platform_usage"("customer_id", "tool", "period");

-- CreateIndex
CREATE UNIQUE INDEX "platform_payments_paddle_transaction_id_key" ON "platform_payments"("paddle_transaction_id");

-- CreateIndex
CREATE INDEX "platform_payments_customer_id_occurred_at_idx" ON "platform_payments"("customer_id", "occurred_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "platform_webhook_events_paddle_event_id_key" ON "platform_webhook_events"("paddle_event_id");

-- CreateIndex
CREATE INDEX "platform_webhook_events_status_created_at_idx" ON "platform_webhook_events"("status", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "platform_brands_customer_id_key" ON "platform_brands"("customer_id");

-- CreateIndex
CREATE INDEX "platform_admin_actions_target_type_target_id_idx" ON "platform_admin_actions"("target_type", "target_id");

-- CreateIndex
CREATE INDEX "platform_admin_actions_staff_user_id_created_at_idx" ON "platform_admin_actions"("staff_user_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "sign_templates_slug_version_key" ON "sign_templates"("slug", "version");

-- CreateIndex
CREATE UNIQUE INDEX "sign_documents_public_id_key" ON "sign_documents"("public_id");

-- CreateIndex
CREATE UNIQUE INDEX "sign_documents_ledger_entry_id_key" ON "sign_documents"("ledger_entry_id");

-- CreateIndex
CREATE UNIQUE INDEX "sign_documents_final_file_id_key" ON "sign_documents"("final_file_id");

-- CreateIndex
CREATE INDEX "sign_documents_owner_id_status_created_at_idx" ON "sign_documents"("owner_id", "status", "created_at" DESC);

-- CreateIndex
CREATE INDEX "sign_documents_status_expires_at_idx" ON "sign_documents"("status", "expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "sign_signers_token_hash_key" ON "sign_signers"("token_hash");

-- CreateIndex
CREATE UNIQUE INDEX "sign_signers_signature_file_id_key" ON "sign_signers"("signature_file_id");

-- CreateIndex
CREATE INDEX "sign_signers_document_id_order_idx" ON "sign_signers"("document_id", "order");

-- CreateIndex
CREATE UNIQUE INDEX "sign_signers_document_id_email_key" ON "sign_signers"("document_id", "email");

-- CreateIndex
CREATE INDEX "sign_fields_document_id_idx" ON "sign_fields"("document_id");

-- CreateIndex
CREATE INDEX "sign_fields_signer_id_idx" ON "sign_fields"("signer_id");

-- CreateIndex
CREATE UNIQUE INDEX "sign_files_storage_key_key" ON "sign_files"("storage_key");

-- CreateIndex
CREATE INDEX "sign_files_owner_id_idx" ON "sign_files"("owner_id");

-- CreateIndex
CREATE INDEX "sign_files_document_id_kind_idx" ON "sign_files"("document_id", "kind");

-- CreateIndex
CREATE INDEX "sign_audit_events_document_id_occurred_at_idx" ON "sign_audit_events"("document_id", "occurred_at");

-- CreateIndex
CREATE UNIQUE INDEX "sign_audit_events_document_id_sequence_key" ON "sign_audit_events"("document_id", "sequence");

-- AddForeignKey
ALTER TABLE "platform_sessions" ADD CONSTRAINT "platform_sessions_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "platform_customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_subscriptions" ADD CONSTRAINT "platform_subscriptions_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "platform_customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_credit_ledger" ADD CONSTRAINT "platform_credit_ledger_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "platform_customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_usage" ADD CONSTRAINT "platform_usage_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "platform_customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_payments" ADD CONSTRAINT "platform_payments_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "platform_customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_brands" ADD CONSTRAINT "platform_brands_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "platform_customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sign_documents" ADD CONSTRAINT "sign_documents_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "platform_customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sign_documents" ADD CONSTRAINT "sign_documents_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "sign_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sign_documents" ADD CONSTRAINT "sign_documents_ledger_entry_id_fkey" FOREIGN KEY ("ledger_entry_id") REFERENCES "platform_credit_ledger"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sign_documents" ADD CONSTRAINT "sign_documents_final_file_id_fkey" FOREIGN KEY ("final_file_id") REFERENCES "sign_files"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sign_signers" ADD CONSTRAINT "sign_signers_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "sign_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sign_signers" ADD CONSTRAINT "sign_signers_signature_file_id_fkey" FOREIGN KEY ("signature_file_id") REFERENCES "sign_files"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sign_fields" ADD CONSTRAINT "sign_fields_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "sign_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sign_fields" ADD CONSTRAINT "sign_fields_signer_id_fkey" FOREIGN KEY ("signer_id") REFERENCES "sign_signers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sign_files" ADD CONSTRAINT "sign_files_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "platform_customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sign_files" ADD CONSTRAINT "sign_files_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "sign_documents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sign_audit_events" ADD CONSTRAINT "sign_audit_events_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "sign_documents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sign_audit_events" ADD CONSTRAINT "sign_audit_events_signer_id_fkey" FOREIGN KEY ("signer_id") REFERENCES "sign_signers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
