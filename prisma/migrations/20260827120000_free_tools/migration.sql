-- Free Tools ecosystem (Domain Compare + CMS + affiliate + SEO landing pages).
-- Hand-authored to match the existing migrate-deploy workflow.

-- ─── Categories ────────────────────────────────────────────────

CREATE TABLE "tool_categories" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tool_categories_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "tool_categories_tenantId_slug_key" ON "tool_categories"("tenantId", "slug");
CREATE INDEX "tool_categories_tenantId_idx" ON "tool_categories"("tenantId");

ALTER TABLE "tool_categories" ADD CONSTRAINT "tool_categories_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── Tools ─────────────────────────────────────────────────────

CREATE TABLE "tools" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "shortDescription" TEXT NOT NULL,
    "longDescription" TEXT NOT NULL DEFAULT '',
    "icon" TEXT,
    "categoryId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "toolUrl" TEXT,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "seoKeywords" TEXT,
    "canonicalUrl" TEXT,
    "ogTitle" TEXT,
    "ogDescription" TEXT,
    "ogImage" TEXT,
    "robots" TEXT,
    "contentJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tools_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "tools_tenantId_slug_key" ON "tools"("tenantId", "slug");
CREATE INDEX "tools_tenantId_status_isPublic_idx" ON "tools"("tenantId", "status", "isPublic");
CREATE INDEX "tools_categoryId_idx" ON "tools"("categoryId");

ALTER TABLE "tools" ADD CONSTRAINT "tools_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tools" ADD CONSTRAINT "tools_categoryId_fkey"
    FOREIGN KEY ("categoryId") REFERENCES "tool_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ─── Domain providers ──────────────────────────────────────────

CREATE TABLE "domain_providers" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logoUrl" TEXT,
    "websiteUrl" TEXT,
    "apiEnabled" BOOLEAN NOT NULL DEFAULT false,
    "affiliateEnabled" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'active',
    "priority" INTEGER NOT NULL DEFAULT 100,
    "adapterKey" TEXT NOT NULL,
    "lastSuccessAt" TIMESTAMP(3),
    "lastErrorAt" TIMESTAMP(3),
    "lastError" TEXT,
    "lastResponseMs" INTEGER,
    "rateLimitedUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "domain_providers_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "domain_providers_tenantId_slug_key" ON "domain_providers"("tenantId", "slug");
CREATE INDEX "domain_providers_tenantId_status_priority_idx" ON "domain_providers"("tenantId", "status", "priority");

ALTER TABLE "domain_providers" ADD CONSTRAINT "domain_providers_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── Affiliate programs ────────────────────────────────────────

CREATE TABLE "affiliate_programs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "programName" TEXT NOT NULL,
    "affiliateNetwork" TEXT,
    "trackingUrl" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "commissionType" TEXT,
    "commissionValue" DOUBLE PRECISION,
    "cookieDuration" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "affiliate_programs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "affiliate_programs_tenantId_idx" ON "affiliate_programs"("tenantId");
CREATE INDEX "affiliate_programs_providerId_idx" ON "affiliate_programs"("providerId");

ALTER TABLE "affiliate_programs" ADD CONSTRAINT "affiliate_programs_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "affiliate_programs" ADD CONSTRAINT "affiliate_programs_providerId_fkey"
    FOREIGN KEY ("providerId") REFERENCES "domain_providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── Affiliate clicks ──────────────────────────────────────────

CREATE TABLE "affiliate_clicks" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "toolId" TEXT,
    "providerId" TEXT NOT NULL,
    "domain" TEXT,
    "sessionId" TEXT,
    "referrer" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "affiliate_clicks_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "affiliate_clicks_tenantId_createdAt_idx" ON "affiliate_clicks"("tenantId", "createdAt");
CREATE INDEX "affiliate_clicks_providerId_idx" ON "affiliate_clicks"("providerId");
CREATE INDEX "affiliate_clicks_toolId_idx" ON "affiliate_clicks"("toolId");

ALTER TABLE "affiliate_clicks" ADD CONSTRAINT "affiliate_clicks_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "affiliate_clicks" ADD CONSTRAINT "affiliate_clicks_toolId_fkey"
    FOREIGN KEY ("toolId") REFERENCES "tools"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "affiliate_clicks" ADD CONSTRAINT "affiliate_clicks_providerId_fkey"
    FOREIGN KEY ("providerId") REFERENCES "domain_providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── Domain search cache ───────────────────────────────────────

CREATE TABLE "domain_search_cache" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "available" BOOLEAN,
    "registrationPrice" DOUBLE PRECISION,
    "renewalPrice" DOUBLE PRECISION,
    "transferPrice" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "responseData" TEXT,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "domain_search_cache_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "domain_search_cache_tenantId_domain_providerId_key"
    ON "domain_search_cache"("tenantId", "domain", "providerId");
CREATE INDEX "domain_search_cache_expiresAt_idx" ON "domain_search_cache"("expiresAt");
CREATE INDEX "domain_search_cache_providerId_idx" ON "domain_search_cache"("providerId");

ALTER TABLE "domain_search_cache" ADD CONSTRAINT "domain_search_cache_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "domain_search_cache" ADD CONSTRAINT "domain_search_cache_providerId_fkey"
    FOREIGN KEY ("providerId") REFERENCES "domain_providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── Domain prices (TLD snapshots) ─────────────────────────────

CREATE TABLE "domain_prices" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "tld" TEXT NOT NULL,
    "registrationPrice" DOUBLE PRECISION,
    "renewalPrice" DOUBLE PRECISION,
    "transferPrice" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "domain_prices_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "domain_prices_tenantId_tld_capturedAt_idx" ON "domain_prices"("tenantId", "tld", "capturedAt");
CREATE INDEX "domain_prices_providerId_idx" ON "domain_prices"("providerId");

ALTER TABLE "domain_prices" ADD CONSTRAINT "domain_prices_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "domain_prices" ADD CONSTRAINT "domain_prices_providerId_fkey"
    FOREIGN KEY ("providerId") REFERENCES "domain_providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── Domain extensions (TLD landing pages) ─────────────────────

CREATE TABLE "domain_extensions" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "tld" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "content" TEXT,
    "faqJson" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "domain_extensions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "domain_extensions_tenantId_tld_key" ON "domain_extensions"("tenantId", "tld");
CREATE INDEX "domain_extensions_tenantId_status_idx" ON "domain_extensions"("tenantId", "status");

ALTER TABLE "domain_extensions" ADD CONSTRAINT "domain_extensions_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── Registrar comparisons ─────────────────────────────────────

CREATE TABLE "registrar_comparisons" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "providerAId" TEXT NOT NULL,
    "providerBId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "registrar_comparisons_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "registrar_comparisons_tenantId_slug_key" ON "registrar_comparisons"("tenantId", "slug");
CREATE INDEX "registrar_comparisons_tenantId_status_idx" ON "registrar_comparisons"("tenantId", "status");

ALTER TABLE "registrar_comparisons" ADD CONSTRAINT "registrar_comparisons_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "registrar_comparisons" ADD CONSTRAINT "registrar_comparisons_providerAId_fkey"
    FOREIGN KEY ("providerAId") REFERENCES "domain_providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "registrar_comparisons" ADD CONSTRAINT "registrar_comparisons_providerBId_fkey"
    FOREIGN KEY ("providerBId") REFERENCES "domain_providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── Search-intent SEO landing pages ───────────────────────────

CREATE TABLE "seo_landing_pages" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "pageType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "canonicalUrl" TEXT,
    "ogImage" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "seo_landing_pages_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "seo_landing_pages_tenantId_slug_key" ON "seo_landing_pages"("tenantId", "slug");
CREATE INDEX "seo_landing_pages_tenantId_status_idx" ON "seo_landing_pages"("tenantId", "status");

ALTER TABLE "seo_landing_pages" ADD CONSTRAINT "seo_landing_pages_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── Tool analytics events ─────────────────────────────────────

CREATE TABLE "tool_analytics_events" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "toolId" TEXT,
    "eventType" TEXT NOT NULL,
    "providerId" TEXT,
    "domain" TEXT,
    "tld" TEXT,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tool_analytics_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "tool_analytics_events_tenantId_eventType_createdAt_idx"
    ON "tool_analytics_events"("tenantId", "eventType", "createdAt");
CREATE INDEX "tool_analytics_events_tenantId_toolId_createdAt_idx"
    ON "tool_analytics_events"("tenantId", "toolId", "createdAt");
CREATE INDEX "tool_analytics_events_providerId_idx" ON "tool_analytics_events"("providerId");

ALTER TABLE "tool_analytics_events" ADD CONSTRAINT "tool_analytics_events_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tool_analytics_events" ADD CONSTRAINT "tool_analytics_events_toolId_fkey"
    FOREIGN KEY ("toolId") REFERENCES "tools"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "tool_analytics_events" ADD CONSTRAINT "tool_analytics_events_providerId_fkey"
    FOREIGN KEY ("providerId") REFERENCES "domain_providers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
