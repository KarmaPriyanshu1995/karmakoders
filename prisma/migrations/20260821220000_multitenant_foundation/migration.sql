-- ===========================================================
-- Multi-tenant foundation
--
-- Hand-authored (not `prisma migrate dev`-generated) because the
-- shadow-database replay of the historical `20260509141623_init`
-- migration fails on Postgres (it still contains a leftover
-- SQLite `DATETIME` column type from before this project switched
-- datasources). That file is left untouched to avoid invalidating
-- its checksum against the already-applied migration history on
-- real databases; this migration is applied directly via
-- `prisma migrate deploy`, which does not require a shadow DB.
--
-- Safety: every existing tenant-owned table gets its new
-- "tenantId" column added as NULLABLE first, backfilled to a
-- single default "KarmaKoders" tenant, and only then set NOT NULL.
-- No existing rows are dropped or altered otherwise.
-- ===========================================================

-- ─── Enums ─────────────────────────────────────────────────────

CREATE TYPE "TenantStatus" AS ENUM ('ACTIVE', 'SUSPENDED');
CREATE TYPE "MembershipRole" AS ENUM ('TENANT_ADMIN', 'MANAGER', 'EDITOR', 'AUTHOR', 'HR', 'EMPLOYEE', 'VIEWER');
CREATE TYPE "MembershipStatus" AS ENUM ('ACTIVE', 'INVITED', 'SUSPENDED');

-- ─── Tenant ────────────────────────────────────────────────────

CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "status" "TenantStatus" NOT NULL DEFAULT 'ACTIVE',
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "logo" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "website" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Tenant_slug_key" ON "Tenant"("slug");
CREATE INDEX "Tenant_status_idx" ON "Tenant"("status");

-- Default tenant that all pre-existing (pre-multi-tenant) data is migrated into.
INSERT INTO "Tenant" ("id", "name", "slug", "status", "isPrimary", "email", "createdAt", "updatedAt")
VALUES ('default-tenant-karmakoders', 'KarmaKoders', 'karmakoders', 'ACTIVE', true, 'karmakoders@gmail.com', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- ─── Membership ────────────────────────────────────────────────

CREATE TABLE "Membership" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "role" "MembershipRole" NOT NULL DEFAULT 'TENANT_ADMIN',
    "status" "MembershipStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Membership_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Membership_userId_tenantId_key" ON "Membership"("userId", "tenantId");
CREATE INDEX "Membership_userId_idx" ON "Membership"("userId");
CREATE INDEX "Membership_tenantId_idx" ON "Membership"("tenantId");

ALTER TABLE "Membership" ADD CONSTRAINT "Membership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── User: real credential auth fields ────────────────────────

ALTER TABLE "User" ADD COLUMN "passwordHash" TEXT;
ALTER TABLE "User" ADD COLUMN "isSuperAdmin" BOOLEAN NOT NULL DEFAULT false;

-- ─── SiteConfig ────────────────────────────────────────────────

ALTER TABLE "SiteConfig" ADD COLUMN "tenantId" TEXT;
UPDATE "SiteConfig" SET "tenantId" = 'default-tenant-karmakoders' WHERE "tenantId" IS NULL;
ALTER TABLE "SiteConfig" ALTER COLUMN "tenantId" SET NOT NULL;
DROP INDEX "SiteConfig_key_key";
CREATE UNIQUE INDEX "SiteConfig_tenantId_key_key" ON "SiteConfig"("tenantId", "key");
CREATE INDEX "SiteConfig_tenantId_idx" ON "SiteConfig"("tenantId");
ALTER TABLE "SiteConfig" ADD CONSTRAINT "SiteConfig_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── Page ──────────────────────────────────────────────────────

ALTER TABLE "Page" ADD COLUMN "tenantId" TEXT;
UPDATE "Page" SET "tenantId" = 'default-tenant-karmakoders' WHERE "tenantId" IS NULL;
ALTER TABLE "Page" ALTER COLUMN "tenantId" SET NOT NULL;
DROP INDEX "Page_slug_key";
CREATE UNIQUE INDEX "Page_tenantId_slug_key" ON "Page"("tenantId", "slug");
CREATE INDEX "Page_tenantId_idx" ON "Page"("tenantId");
ALTER TABLE "Page" ADD CONSTRAINT "Page_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── Project ───────────────────────────────────────────────────

ALTER TABLE "Project" ADD COLUMN "tenantId" TEXT;
UPDATE "Project" SET "tenantId" = 'default-tenant-karmakoders' WHERE "tenantId" IS NULL;
ALTER TABLE "Project" ALTER COLUMN "tenantId" SET NOT NULL;
DROP INDEX "Project_slug_key";
CREATE UNIQUE INDEX "Project_tenantId_slug_key" ON "Project"("tenantId", "slug");
CREATE INDEX "Project_tenantId_idx" ON "Project"("tenantId");
ALTER TABLE "Project" ADD CONSTRAINT "Project_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── Post ──────────────────────────────────────────────────────

ALTER TABLE "Post" ADD COLUMN "tenantId" TEXT;
UPDATE "Post" SET "tenantId" = 'default-tenant-karmakoders' WHERE "tenantId" IS NULL;
ALTER TABLE "Post" ALTER COLUMN "tenantId" SET NOT NULL;
DROP INDEX "Post_slug_key";
CREATE UNIQUE INDEX "Post_tenantId_slug_key" ON "Post"("tenantId", "slug");
CREATE INDEX "Post_tenantId_idx" ON "Post"("tenantId");
ALTER TABLE "Post" ADD CONSTRAINT "Post_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── ContactSubmission ─────────────────────────────────────────

ALTER TABLE "ContactSubmission" ADD COLUMN "tenantId" TEXT;
UPDATE "ContactSubmission" SET "tenantId" = 'default-tenant-karmakoders' WHERE "tenantId" IS NULL;
ALTER TABLE "ContactSubmission" ALTER COLUMN "tenantId" SET NOT NULL;
CREATE INDEX "ContactSubmission_tenantId_idx" ON "ContactSubmission"("tenantId");
ALTER TABLE "ContactSubmission" ADD CONSTRAINT "ContactSubmission_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── NewsletterSubscriber ──────────────────────────────────────

ALTER TABLE "NewsletterSubscriber" ADD COLUMN "tenantId" TEXT;
UPDATE "NewsletterSubscriber" SET "tenantId" = 'default-tenant-karmakoders' WHERE "tenantId" IS NULL;
ALTER TABLE "NewsletterSubscriber" ALTER COLUMN "tenantId" SET NOT NULL;
DROP INDEX "NewsletterSubscriber_email_key";
CREATE UNIQUE INDEX "NewsletterSubscriber_tenantId_email_key" ON "NewsletterSubscriber"("tenantId", "email");
CREATE INDEX "NewsletterSubscriber_tenantId_idx" ON "NewsletterSubscriber"("tenantId");
ALTER TABLE "NewsletterSubscriber" ADD CONSTRAINT "NewsletterSubscriber_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── JobOpening ────────────────────────────────────────────────

ALTER TABLE "JobOpening" ADD COLUMN "tenantId" TEXT;
UPDATE "JobOpening" SET "tenantId" = 'default-tenant-karmakoders' WHERE "tenantId" IS NULL;
ALTER TABLE "JobOpening" ALTER COLUMN "tenantId" SET NOT NULL;
DROP INDEX "JobOpening_slug_key";
CREATE UNIQUE INDEX "JobOpening_tenantId_slug_key" ON "JobOpening"("tenantId", "slug");
CREATE INDEX "JobOpening_tenantId_idx" ON "JobOpening"("tenantId");
ALTER TABLE "JobOpening" ADD CONSTRAINT "JobOpening_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── JobApplication ────────────────────────────────────────────

ALTER TABLE "JobApplication" ADD COLUMN "tenantId" TEXT;
UPDATE "JobApplication" SET "tenantId" = 'default-tenant-karmakoders' WHERE "tenantId" IS NULL;
ALTER TABLE "JobApplication" ALTER COLUMN "tenantId" SET NOT NULL;
CREATE INDEX "JobApplication_tenantId_idx" ON "JobApplication"("tenantId");
ALTER TABLE "JobApplication" ADD CONSTRAINT "JobApplication_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── Media (new) ───────────────────────────────────────────────

CREATE TABLE "Media" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "key" TEXT,
    "name" TEXT NOT NULL,
    "size" INTEGER,
    "mimeType" TEXT,
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Media_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Media_tenantId_idx" ON "Media"("tenantId");
ALTER TABLE "Media" ADD CONSTRAINT "Media_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── AuditLog (new) ────────────────────────────────────────────

CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "resource" TEXT,
    "resourceId" TEXT,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AuditLog_tenantId_idx" ON "AuditLog"("tenantId");
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ─── SEO Intelligence Center: tenant scoping ───────────────────

ALTER TABLE "seo_pages" ADD COLUMN "tenantId" TEXT;
UPDATE "seo_pages" SET "tenantId" = 'default-tenant-karmakoders' WHERE "tenantId" IS NULL;
ALTER TABLE "seo_pages" ALTER COLUMN "tenantId" SET NOT NULL;
DROP INDEX "seo_pages_pageType_pageId_key";
CREATE UNIQUE INDEX "seo_pages_tenantId_pageType_pageId_key" ON "seo_pages"("tenantId", "pageType", "pageId");
CREATE INDEX "seo_pages_tenantId_idx" ON "seo_pages"("tenantId");
ALTER TABLE "seo_pages" ADD CONSTRAINT "seo_pages_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "seo_entities" ADD COLUMN "tenantId" TEXT;
UPDATE "seo_entities" SET "tenantId" = 'default-tenant-karmakoders' WHERE "tenantId" IS NULL;
ALTER TABLE "seo_entities" ALTER COLUMN "tenantId" SET NOT NULL;
CREATE INDEX "seo_entities_tenantId_idx" ON "seo_entities"("tenantId");
ALTER TABLE "seo_entities" ADD CONSTRAINT "seo_entities_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "seo_clusters" ADD COLUMN "tenantId" TEXT;
UPDATE "seo_clusters" SET "tenantId" = 'default-tenant-karmakoders' WHERE "tenantId" IS NULL;
ALTER TABLE "seo_clusters" ALTER COLUMN "tenantId" SET NOT NULL;
DROP INDEX "seo_clusters_slug_key";
CREATE UNIQUE INDEX "seo_clusters_tenantId_slug_key" ON "seo_clusters"("tenantId", "slug");
CREATE INDEX "seo_clusters_tenantId_idx" ON "seo_clusters"("tenantId");
ALTER TABLE "seo_clusters" ADD CONSTRAINT "seo_clusters_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "seo_audits" ADD COLUMN "tenantId" TEXT;
UPDATE "seo_audits" SET "tenantId" = 'default-tenant-karmakoders' WHERE "tenantId" IS NULL;
ALTER TABLE "seo_audits" ALTER COLUMN "tenantId" SET NOT NULL;
CREATE INDEX "seo_audits_tenantId_idx" ON "seo_audits"("tenantId");
ALTER TABLE "seo_audits" ADD CONSTRAINT "seo_audits_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "seo_internal_links" ADD COLUMN "tenantId" TEXT;
UPDATE "seo_internal_links" SET "tenantId" = 'default-tenant-karmakoders' WHERE "tenantId" IS NULL;
ALTER TABLE "seo_internal_links" ALTER COLUMN "tenantId" SET NOT NULL;
CREATE INDEX "seo_internal_links_tenantId_idx" ON "seo_internal_links"("tenantId");
ALTER TABLE "seo_internal_links" ADD CONSTRAINT "seo_internal_links_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "seo_schema" ADD COLUMN "tenantId" TEXT;
UPDATE "seo_schema" SET "tenantId" = 'default-tenant-karmakoders' WHERE "tenantId" IS NULL;
ALTER TABLE "seo_schema" ALTER COLUMN "tenantId" SET NOT NULL;
CREATE INDEX "seo_schema_tenantId_idx" ON "seo_schema"("tenantId");
ALTER TABLE "seo_schema" ADD CONSTRAINT "seo_schema_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "seo_reports" ADD COLUMN "tenantId" TEXT;
UPDATE "seo_reports" SET "tenantId" = 'default-tenant-karmakoders' WHERE "tenantId" IS NULL;
ALTER TABLE "seo_reports" ALTER COLUMN "tenantId" SET NOT NULL;
CREATE INDEX "seo_reports_tenantId_idx" ON "seo_reports"("tenantId");
ALTER TABLE "seo_reports" ADD CONSTRAINT "seo_reports_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "seo_issues" ADD COLUMN "tenantId" TEXT;
UPDATE "seo_issues" SET "tenantId" = 'default-tenant-karmakoders' WHERE "tenantId" IS NULL;
ALTER TABLE "seo_issues" ALTER COLUMN "tenantId" SET NOT NULL;
CREATE INDEX "seo_issues_tenantId_idx" ON "seo_issues"("tenantId");
ALTER TABLE "seo_issues" ADD CONSTRAINT "seo_issues_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "seo_keyword_opportunities" ADD COLUMN "tenantId" TEXT;
UPDATE "seo_keyword_opportunities" SET "tenantId" = 'default-tenant-karmakoders' WHERE "tenantId" IS NULL;
ALTER TABLE "seo_keyword_opportunities" ALTER COLUMN "tenantId" SET NOT NULL;
CREATE INDEX "seo_keyword_opportunities_tenantId_idx" ON "seo_keyword_opportunities"("tenantId");
ALTER TABLE "seo_keyword_opportunities" ADD CONSTRAINT "seo_keyword_opportunities_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "seo_ctr_reports" ADD COLUMN "tenantId" TEXT;
UPDATE "seo_ctr_reports" SET "tenantId" = 'default-tenant-karmakoders' WHERE "tenantId" IS NULL;
ALTER TABLE "seo_ctr_reports" ALTER COLUMN "tenantId" SET NOT NULL;
CREATE INDEX "seo_ctr_reports_tenantId_idx" ON "seo_ctr_reports"("tenantId");
ALTER TABLE "seo_ctr_reports" ADD CONSTRAINT "seo_ctr_reports_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "seo_content_gaps" ADD COLUMN "tenantId" TEXT;
UPDATE "seo_content_gaps" SET "tenantId" = 'default-tenant-karmakoders' WHERE "tenantId" IS NULL;
ALTER TABLE "seo_content_gaps" ALTER COLUMN "tenantId" SET NOT NULL;
CREATE INDEX "seo_content_gaps_tenantId_idx" ON "seo_content_gaps"("tenantId");
ALTER TABLE "seo_content_gaps" ADD CONSTRAINT "seo_content_gaps_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "seo_brand" ADD COLUMN "tenantId" TEXT;
UPDATE "seo_brand" SET "tenantId" = 'default-tenant-karmakoders' WHERE "tenantId" IS NULL;
ALTER TABLE "seo_brand" ALTER COLUMN "tenantId" SET NOT NULL;
CREATE INDEX "seo_brand_tenantId_idx" ON "seo_brand"("tenantId");
ALTER TABLE "seo_brand" ADD CONSTRAINT "seo_brand_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "seo_search_console" ADD COLUMN "tenantId" TEXT;
UPDATE "seo_search_console" SET "tenantId" = 'default-tenant-karmakoders' WHERE "tenantId" IS NULL;
ALTER TABLE "seo_search_console" ALTER COLUMN "tenantId" SET NOT NULL;
CREATE INDEX "seo_search_console_tenantId_idx" ON "seo_search_console"("tenantId");
ALTER TABLE "seo_search_console" ADD CONSTRAINT "seo_search_console_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "seo_automation_logs" ADD COLUMN "tenantId" TEXT;
UPDATE "seo_automation_logs" SET "tenantId" = 'default-tenant-karmakoders' WHERE "tenantId" IS NULL;
ALTER TABLE "seo_automation_logs" ALTER COLUMN "tenantId" SET NOT NULL;
CREATE INDEX "seo_automation_logs_tenantId_idx" ON "seo_automation_logs"("tenantId");
ALTER TABLE "seo_automation_logs" ADD CONSTRAINT "seo_automation_logs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── Seed real User rows for the two existing hardcoded accounts ─
-- Passwords are bcrypt hashes of the same fallback credentials this
-- app already used in src/lib/auth.ts (ADMIN_EMAIL/ADMIN_PASSWORD and
-- SUPER_ADMIN_EMAIL/SUPER_ADMIN_PASSWORD default values, confirmed to
-- be the live credentials since no overrides are set in .env), so
-- existing login credentials keep working unchanged.

INSERT INTO "User" ("id", "name", "email", "role", "isSuperAdmin", "passwordHash")
SELECT 'default-user-superadmin', 'Super Admin', 'priyanshu@karmakoders.com', 'SUPER_ADMIN', true, '$2b$10$vNeUHvcFjc29VgYUmrQ2muQ2is1qaZPVfgtQpUMWdliXGnezbCX3e'
WHERE NOT EXISTS (SELECT 1 FROM "User" WHERE "email" = 'priyanshu@karmakoders.com');

INSERT INTO "User" ("id", "name", "email", "role", "isSuperAdmin", "passwordHash")
SELECT 'default-user-tenantadmin', 'Admin', 'karmakoders@gmail.com', 'TENANT_ADMIN', false, '$2b$10$sN9Z0pXhcTy0aUdQKUhovu5RavY.k5F/72DIr4LPWC8ZbgEVFeV0q'
WHERE NOT EXISTS (SELECT 1 FROM "User" WHERE "email" = 'karmakoders@gmail.com');

INSERT INTO "Membership" ("id", "userId", "tenantId", "role", "status", "updatedAt")
SELECT 'default-membership-tenantadmin', "id", 'default-tenant-karmakoders', 'TENANT_ADMIN', 'ACTIVE', CURRENT_TIMESTAMP
FROM "User" WHERE "email" = 'karmakoders@gmail.com'
ON CONFLICT ("userId", "tenantId") DO NOTHING;
